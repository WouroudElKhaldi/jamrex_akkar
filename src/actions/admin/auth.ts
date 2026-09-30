"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { adminBase, checkPassword, getStaff, staffAuth, throttle } from "@/lib/auth";
import { log } from "@/lib/audit";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/utils";

export type LoginState = { error?: "bad" | "locked" | "code" | "badcode" } | null;

export async function staffLogin(_: LoginState, fd: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(fd.get("email") || ""));
  const password = String(fd.get("password") || "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!throttle(`slogin:${ip}`, 15, 10 * 60_000)) {
    await log({ actor: email || "unknown", action: "login.blocked", entity: "user", category: "security", level: "warn", summary: `Too many sign-in attempts from this address (last tried: ${email || "no email"})`, meta: { email } });
    return { error: "locked" };
  }

  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await log({ user, action: "login.blocked", entity: "user", entityId: user.id, category: "security", level: "warn", summary: `${user.name} tried to sign in while the account is locked`, meta: { email } });
    return { error: "locked" };
  }

  const code = String(fd.get("code") || "").trim();
  const pwOk = !!user && user.active && (await checkPassword(password, user.passwordHash));
  // right password on a 2FA account but no code yet: ask for it (this is not counted as a failed attempt)
  if (pwOk && user!.totpEnabled && !code) return { error: "code" };

  let ok = false;
  try {
    await staffAuth.signIn("staff", { email, password, code, redirect: false });
    ok = true;
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
  }

  if (!ok) {
    // 5 wrong passwords lock the account for 15 minutes
    if (user) {
      const fails = user.failedLogins + 1;
      const lock = fails >= 5;
      await db.user.update({ where: { id: user.id }, data: lock ? { failedLogins: 0, lockedUntil: new Date(Date.now() + 15 * 60_000) } : { failedLogins: fails } });
      await log({
        user,
        action: lock ? "login.locked" : "login.failed",
        entity: "user",
        entityId: user.id,
        category: "security",
        level: lock ? "error" : "warn",
        summary: lock ? `${user.name}'s account was locked for 15 minutes after 5 wrong passwords` : `Wrong password for ${user.name} (attempt ${fails} of 5)`,
        meta: { email, attempt: fails },
      });
    } else {
      await log({ actor: email || "unknown", action: "login.failed", entity: "user", category: "security", level: "warn", summary: `Sign-in attempt with an unknown or inactive account: ${email || "(empty)"}`, meta: { email } });
    }
    return { error: pwOk && user!.totpEnabled ? "badcode" : "bad" };
  }
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await log({ user, action: "login", entity: "user", entityId: user.id, category: "auth", summary: `${user.name} signed in` });
  }
  redirect(adminBase());
}

export async function staffLogout() {
  const u = await getStaff();
  if (u) await log({ user: u, action: "logout", entity: "user", entityId: u.id, category: "auth", summary: `${u.name} signed out` });
  await staffAuth.signOut({ redirect: false });
  redirect(adminBase() + "/login");
}

export async function setAdminLang(lang: "en" | "ar") {
  (await cookies()).set("admin_lang", lang === "ar" ? "ar" : "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
}
