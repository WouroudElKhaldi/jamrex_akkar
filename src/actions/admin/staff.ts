"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, can, hashPassword, requireStaff } from "@/lib/auth";
import { change } from "@/lib/audit";
import { STAFF_MIN, validatePassword } from "@/lib/password";
import { PERM_KEYS } from "@/lib/permissions";
import { normalizeEmail } from "@/lib/utils";

export type StaffState = { ok?: boolean; error?: string } | null;

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  password: z.string().max(100).optional().default(""),
});

export async function saveStaff(_: StaffState, fd: FormData): Promise<StaffState> {
  const actor = await requireStaff("staff.manage");
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  const email = normalizeEmail(p.data.email);
  const active = fd.get("active") === "1";

  const existing = p.data.id ? await db.user.findUnique({ where: { id: p.data.id }, include: { permissions: true } }) : null;
  if (p.data.id && (!existing || existing.hidden)) return { error: "notfound" };
  if (existing?.isOwner && !actor.isOwner) return { error: "owner" };
  if (existing && existing.id === actor.id && !active) return { error: "self" };
  if (!existing && !p.data.password) return { error: "password" };
  if (p.data.password) {
    const pw = validatePassword(p.data.password, { min: STAFF_MIN, identity: [p.data.name, p.data.email] });
    if (!pw.ok) return { error: pw.reason === "short" ? "password" : "passwordWeak" };
  }

  const clash = await db.user.findFirst({ where: { email, ...(existing ? { NOT: { id: existing.id } } : {}) }, select: { id: true } });
  if (clash) return { error: "email" };

  // permissions: only the ones the actor may hand out; ones the actor does not hold are left untouched
  let perms: string[] | null = null;
  if (can(actor, "permissions.manage")) {
    const selected = PERM_KEYS.filter((k) => fd.get(`perm:${k}`) === "1");
    const mine = (k: string) => actor.isOwner || actor.perms.has(k);
    const keptFromTarget = (existing?.permissions ?? []).map((x) => x.key).filter((k) => !mine(k));
    perms = [...new Set([...selected.filter(mine), ...keptFromTarget])];
  }

  const passwordHash = p.data.password ? await hashPassword(p.data.password) : undefined;
  let id: string;
  if (existing) {
    const nowActive = existing.isOwner ? true : active;
    const revoke = !!passwordHash || (existing.active && !nowActive); // password changed or account switched off: end their sessions
    await db.user.update({ where: { id: existing.id }, data: { name: p.data.name, email, active: nowActive, ...(passwordHash ? { passwordHash, failedLogins: 0, lockedUntil: null } : {}), ...(revoke ? { sessionVersion: { increment: 1 } } : {}) } });
    id = existing.id;
  } else {
    const u = await db.user.create({ data: { name: p.data.name, email, active, passwordHash: passwordHash! } });
    id = u.id;
  }
  if (perms && !(existing?.isOwner)) {
    await db.$transaction([db.userPermission.deleteMany({ where: { userId: id } }), db.userPermission.createMany({ data: perms.map((key) => ({ userId: id, key })) })]);
  }
  // human-readable list of what actually changed
  const before = new Set((existing?.permissions ?? []).map((x) => x.key));
  const after = new Set(perms ?? [...before]);
  const added = [...after].filter((k) => !before.has(k));
  const removed = [...before].filter((k) => !after.has(k));
  const changes: string[] = [];
  if (existing) {
    if (existing.name !== p.data.name) changes.push(change("name", existing.name, p.data.name));
    if (existing.email !== email) changes.push(change("email", existing.email, email));
    if (!existing.isOwner && existing.active !== active) changes.push(active ? "account re-activated" : "account deactivated");
    if (passwordHash) changes.push("password was reset");
  }
  if (added.length) changes.push("permissions added: " + added.join(", "));
  if (removed.length) changes.push("permissions removed: " + removed.join(", "));
  const permissionChange = added.length > 0 || removed.length > 0;
  await audit(
    actor,
    existing ? "staff.update" : "staff.create",
    "user",
    id,
    { name: p.data.name, email, active, permissions: [...after].sort(), added, removed, changes },
    existing ? `${actor.name} updated employee ${p.data.name}${changes.length ? ": " + changes.join("; ") : " (no changes)"}` : `${actor.name} created employee ${p.data.name} (${email}) with ${after.size} permission${after.size === 1 ? "" : "s"}`,
    { category: permissionChange || !existing ? "staff" : undefined, level: permissionChange && removed.length === 0 && added.length > 3 ? "warn" : "info" },
  );
  revalidatePath("/adm", "layout");
  return { ok: true };
}

export async function deleteStaff(fd: FormData) {
  const actor = await requireStaff("staff.manage");
  const id = String(fd.get("id"));
  const u = await db.user.findFirst({ where: { id, hidden: false } });
  if (!u || u.isOwner || u.id === actor.id) return;
  await db.user.delete({ where: { id } });
  await audit(actor, "staff.delete", "user", id, { name: u.name, email: u.email }, `${actor.name} deleted employee ${u.name} (${u.email})`, { level: "warn" });
  revalidatePath("/adm", "layout");
}
