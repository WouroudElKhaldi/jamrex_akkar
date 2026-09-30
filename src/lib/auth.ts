import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { autoSummary, log, type LogCategory, type LogLevel } from "@/lib/audit";
import { consumeSecondFactor } from "@/lib/totp";

// Authentication is handled by NextAuth (Auth.js v5). Two completely separate instances,
// each with its own session cookie, so a customer login never mixes with a staff login:
//   staffAuth    -> cookie jm_staff  (dashboard employees)   /api/auth/staff/*
//   customerAuth -> cookie jm_cust   (shop customers)        /api/auth/customer/*

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}
export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const secure = process.env.NODE_ENV === "production";
const cookie = (name: string, sameSite: "lax" | "strict" = "lax") => ({ name, options: { httpOnly: true, sameSite, path: "/", secure } });

// ───────────────────────── Staff ─────────────────────────

export const staffAuth = NextAuth({
  trustHost: true,
  basePath: "/api/auth/staff",
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  cookies: {
    sessionToken: cookie("jm_staff", "strict"), // the dashboard is only ever used from our own site
    csrfToken: cookie("jm_csrf_staff"),
    callbackUrl: cookie("jm_cb_staff"),
  },
  providers: [
    Credentials({
      id: "staff",
      credentials: { email: {}, password: {}, code: {} },
      async authorize(c) {
        const email = String(c?.email ?? "").trim().toLowerCase();
        const password = String(c?.password ?? "");
        if (!email || !password) return null;
        const u = await db.user.findUnique({ where: { email } });
        if (!u || !u.active) return null;
        if (u.lockedUntil && u.lockedUntil > new Date()) return null;
        if (!(await checkPassword(password, u.passwordHash))) return null;
        // two-factor: a valid 6-digit code (or one-time recovery code) is REQUIRED when the account has it switched on
        if (u.totpEnabled) {
          const how = await consumeSecondFactor(u, String(c?.code ?? ""));
          if (!how) return null;
          if (how === "recovery") await log({ user: u, action: "login.recovery-code", entity: "user", entityId: u.id, category: "security", level: "warn", summary: `${u.name} signed in with a one-time recovery code (${u.recoveryHashes.length - 1} left)` });
        }
        return { id: u.id, name: u.name, email: u.email, sv: u.sessionVersion } as { id: string; name: string; email: string };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.sv = (user as unknown as { sv?: number }).sv ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as { id?: string; sv?: number }).id = token.uid as string | undefined;
      (session.user as { id?: string; sv?: number }).sv = token.sv as number | undefined;
      return session;
    },
  },
});

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
  /** the hidden developer/support account (isOwner is also true for it) */
  hidden: boolean;
  perms: Set<string>;
};

export const getStaff = cache(async (): Promise<StaffUser | null> => {
  const s = await staffAuth.auth();
  const su = s?.user as { id?: string; sv?: number } | undefined;
  const uid = su?.id;
  if (!uid) return null;
  // permissions are read fresh from the database on every request, so changes apply immediately
  const u = await db.user.findUnique({ where: { id: uid }, include: { permissions: true } });
  if (!u || !u.active) return null;
  // password changed / account deactivated since this session was issued -> session is dead
  if ((su?.sv ?? 0) !== u.sessionVersion) return null;
  return { id: u.id, name: u.name, email: u.email, isOwner: u.isOwner || u.hidden, hidden: u.hidden, perms: new Set(u.permissions.map((x) => x.key)) };
});

export const can = (u: StaffUser | null, key: string) => !!u && (u.isOwner || u.perms.has(key));

export function adminBase(): string {
  return "/" + (process.env.ADMIN_PATH || "staff");
}

/** For pages & server actions: staff must be signed in and hold `key` (if given). */
export async function requireStaff(key?: string): Promise<StaffUser> {
  const u = await getStaff();
  if (!u) redirect(adminBase() + "/login");
  if (key && !can(u, key)) {
    await log({ user: u, action: "access.denied", entity: "permission", entityId: key, category: "security", level: "warn", summary: `${u.name} tried to use something that needs the "${key}" permission`, meta: { permission: key } });
    redirect(adminBase() + "/forbidden");
  }
  return u;
}

/** For route handlers: never redirect, just return null when not allowed. */
export async function staffWith(key?: string): Promise<StaffUser | null> {
  const u = await getStaff();
  if (!u) return null;
  if (key && !can(u, key)) return null;
  return u;
}

/** Staff activity log entry (thin wrapper around log()). "summary" is the human sentence shown in the Activity log. */
export async function audit(
  u: { id?: string; name: string } | null,
  action: string,
  entity: string,
  entityId?: string,
  meta?: object,
  summary?: string,
  opts?: { category?: LogCategory; level?: LogLevel },
) {
  await log({ user: u, action, entity, entityId, meta, summary: summary ?? autoSummary(action, entity, meta as Record<string, unknown> | undefined), ...opts });
}

// ───────────────────────── Customers ─────────────────────────

export const customerAuth = NextAuth({
  trustHost: true,
  basePath: "/api/auth/customer",
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  cookies: {
    sessionToken: cookie("jm_cust", "lax"),
    csrfToken: cookie("jm_csrf_cust"),
    callbackUrl: cookie("jm_cb_cust"),
  },
  providers: [
    Credentials({
      id: "customer",
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const email = String(c?.email ?? "").trim().toLowerCase();
        const password = String(c?.password ?? "");
        if (!email || !password) return null;
        const u = await db.customer.findUnique({ where: { email } });
        if (!u?.passwordHash) return null;
        if (!(await checkPassword(password, u.passwordHash))) return null;
        return { id: u.id, name: u.name, email: u.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.cid = user.id;
      return token;
    },
    session({ session, token }) {
      (session.user as { id?: string }).id = token.cid as string | undefined;
      return session;
    },
  },
});

export const getCustomer = cache(async () => {
  const s = await customerAuth.auth();
  const cid = (s?.user as { id?: string } | undefined)?.id;
  if (!cid) return null;
  const c = await db.customer.findUnique({ where: { id: cid } });
  if (!c || !c.passwordHash) return null;
  return c;
});

// ───────────────────────── tiny in-memory throttle (per process) ─────────────────────────

const hits = new Map<string, { n: number; reset: number }>();
export function throttle(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k); // sweep expired windows so the map cannot grow forever
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= max;
}
