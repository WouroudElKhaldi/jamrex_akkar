import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { memo } from "@/lib/memo";

export type LogLevel = "info" | "warn" | "error";

export const LOG_CATEGORIES = ["auth", "security", "order", "payment", "catalog", "content", "staff", "settings", "customer", "notification", "system"] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

export type LogInput = {
  /** staff member doing it (omit for customers / system) */
  user?: { id?: string; name: string } | null;
  /** used as the name when there is no staff user, e.g. "Customer: rami@example.com" or "System" */
  actor?: string;
  action: string;
  entity: string;
  entityId?: string | null;
  category?: LogCategory;
  level?: LogLevel;
  summary?: string;
  meta?: object;
};

/** Category from the action name when the caller does not give one. */
export function categoryOf(action: string): LogCategory {
  const p = action.split(".")[0];
  const map: Record<string, LogCategory> = {
    login: "auth", logout: "auth", auth: "auth", access: "security", security: "security",
    order: "order", payment: "payment", whish: "payment",
    product: "catalog", category: "catalog", offer: "catalog", stock: "catalog", variant: "catalog",
    content: "content", page: "content", banner: "content", testimonial: "content", media: "content", upload: "content",
    staff: "staff", permission: "staff",
    settings: "settings", zone: "settings",
    customer: "customer", contact: "customer", message: "customer",
    notification: "notification", notify: "notification",
  };
  return map[p] ?? "system";
}

/**
 * Writes one row to the activity log. Never throws: logging must not break the action it describes.
 * IP address and browser are picked up from the current request when there is one.
 */
/** ids and e-mails of hidden (support) accounts, cached for a minute */
const hiddenAccounts = () => memo("hiddenAccounts", 60_000, () => db.user.findMany({ where: { hidden: true }, select: { id: true, email: true } }));

export async function log(i: LogInput): Promise<void> {
  try {
    const hid = await hiddenAccounts();
    const text = `${i.summary ?? ""} ${i.actor ?? ""} ${i.meta ? JSON.stringify(i.meta) : ""}`.toLowerCase();
    const isHidden = hid.some((h) => (i.user?.id && h.id === i.user.id) || text.includes(h.email.toLowerCase()));
    let ip: string | undefined;
    let ua: string | undefined;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
      ua = h.get("user-agent")?.slice(0, 200) || undefined;
    } catch {
      /* called outside a request (scripts, background jobs) */
    }
    await db.auditLog.create({
      data: {
        userId: i.user?.id ?? null,
        userName: i.user?.name ?? i.actor ?? "System",
        action: i.action,
        entity: i.entity,
        entityId: i.entityId ?? null,
        category: i.category ?? categoryOf(i.action),
        level: i.level ?? "info",
        summary: (i.summary ?? "").slice(0, 500),
        ip: ip ?? null,
        userAgent: ua ?? null,
        meta: i.meta as object | undefined,
        hidden: isHidden,
      },
    });
  } catch (e) {
    console.error("[audit] could not write log entry", e);
  }
}

/** "a → b" style helper for change lists; long text is shortened. */
export const shortText = (v: unknown, n = 80) => {
  const s = v === null || v === undefined || v === "" ? "∅" : String(v);
  return s.length > n ? s.slice(0, n) + "…" : s;
};
export const change = (label: string, from: unknown, to: unknown) => `${label}: ${shortText(from)} → ${shortText(to)}`;

/** A short one-line description used when the caller did not write one. */
export function autoSummary(action: string, entity: string, meta?: Record<string, unknown>): string {
  const name = meta && (meta.name ?? meta.title ?? meta.email);
  const nice = action.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return name ? `${nice}: ${String(name)}` : nice;
}
