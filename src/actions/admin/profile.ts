"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit, checkPassword, hashPassword, requireStaff, throttle } from "@/lib/auth";
import { STAFF_MIN, validatePassword } from "@/lib/password";

export type ProfileState = { ok?: boolean; error?: string; relogin?: boolean } | null;

/** Every employee edits only their own record here: name, and password (which needs the current one). */
export async function updateMyProfile(_: ProfileState, fd: FormData): Promise<ProfileState> {
  const me = await requireStaff();
  const p = z.object({ name: z.string().trim().min(2).max(100) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  if (p.data.name !== me.name) {
    await db.user.update({ where: { id: me.id }, data: { name: p.data.name } });
    await audit(me, "staff.profile", "user", me.id, { name: p.data.name }, `${me.name} changed their display name to ${p.data.name}`);
  }
  return { ok: true };
}

export async function changeMyPassword(_: ProfileState, fd: FormData): Promise<ProfileState> {
  const me = await requireStaff();
  if (!throttle(`pw:${me.id}`, 6, 15 * 60_000)) return { error: "rate" };
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next !== String(fd.get("confirm") ?? "")) return { error: "mismatch" };
  const u = await db.user.findUnique({ where: { id: me.id } });
  if (!u || !(await checkPassword(current, u.passwordHash))) {
    await audit(me, "auth.password.fail", "user", me.id, {}, `${me.name} entered a wrong current password while changing their password`, { category: "security", level: "warn" });
    return { error: "current" };
  }
  const pw = validatePassword(next, { min: STAFF_MIN, identity: [u.name, u.email] });
  if (!pw.ok) return { error: pw.reason === "short" ? "short" : "weak" };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } } });
  await audit(me, "auth.password.change", "user", me.id, {}, `${me.name} changed their own password (all sessions ended)`, { category: "security" });
  return { ok: true, relogin: true };
}
