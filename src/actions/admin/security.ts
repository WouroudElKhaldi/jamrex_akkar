"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { audit, checkPassword, requireStaff, throttle } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret, newRecoveryCodes, newSecret, otpauthUri, consumeSecondFactor, verifyTotp } from "@/lib/totp";

export type BeginResult = { ok: true; secret: string; qr: string } | { ok: false };
export type CodesResult = { ok: true; codes: string[] } | { ok: false; error: "code" | "rate" | "password" };

/** Step 1: make a new secret (not active yet) and a QR code to scan. */
export async function beginTotp(): Promise<BeginResult> {
  const u = await requireStaff();
  const secret = newSecret();
  await db.user.update({ where: { id: u.id }, data: { totpSecretEnc: encryptSecret(secret), totpEnabled: false, totpLastStep: null } });
  const qr = await QRCode.toDataURL(otpauthUri(u.email, secret), { margin: 1, width: 220 });
  return { ok: true, secret, qr };
}

/** Step 2: the user types the first code from their app; only then is 2FA switched on. */
export async function confirmTotp(code: string): Promise<CodesResult> {
  const u = await requireStaff();
  if (!throttle(`totp-confirm:${u.id}`, 8, 10 * 60_000)) return { ok: false, error: "rate" };
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!row.totpSecretEnc) return { ok: false, error: "code" };
  const step = verifyTotp(decryptSecret(row.totpSecretEnc), (code || "").replace(/\s/g, ""), null);
  if (step === null) return { ok: false, error: "code" };
  const { codes, hashes } = newRecoveryCodes();
  await db.user.update({ where: { id: u.id }, data: { totpEnabled: true, totpLastStep: step, recoveryHashes: hashes } });
  await audit(u, "staff.2fa.enabled", "user", u.id, {}, `${u.name} turned on two-factor login`, { category: "security" });
  revalidatePath("/adm", "layout");
  return { ok: true, codes };
}

/** Needs the password AND a current code, so a stolen open session cannot switch protection off. */
export async function disableTotp(password: string, code: string): Promise<{ ok: boolean; error?: "code" | "rate" | "password" }> {
  const u = await requireStaff();
  if (!throttle(`totp-disable:${u.id}`, 6, 10 * 60_000)) return { ok: false, error: "rate" };
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await checkPassword(password || "", row.passwordHash))) return { ok: false, error: "password" };
  if (row.totpEnabled && !(await consumeSecondFactor(row, code))) return { ok: false, error: "code" };
  await db.user.update({ where: { id: u.id }, data: { totpEnabled: false, totpSecretEnc: null, totpLastStep: null, recoveryHashes: [] } });
  await audit(u, "staff.2fa.disabled", "user", u.id, {}, `${u.name} turned OFF two-factor login`, { category: "security", level: "warn" });
  revalidatePath("/adm", "layout");
  return { ok: true };
}

/** New set of recovery codes (old ones stop working). Needs a current code. */
export async function regenerateRecovery(code: string): Promise<CodesResult> {
  const u = await requireStaff();
  if (!throttle(`totp-regen:${u.id}`, 6, 10 * 60_000)) return { ok: false, error: "rate" };
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!row.totpEnabled || !(await consumeSecondFactor(row, code))) return { ok: false, error: "code" };
  const { codes, hashes } = newRecoveryCodes();
  await db.user.update({ where: { id: u.id }, data: { recoveryHashes: hashes } });
  await audit(u, "staff.2fa.recovery-regenerated", "user", u.id, {}, `${u.name} generated new recovery codes`, { category: "security" });
  return { ok: true, codes };
}

/** Owner/manager help for a colleague who lost their phone: switches their 2FA off and signs them out everywhere. */
export async function resetStaffTotp(fd: FormData) {
  const actor = await requireStaff("staff.manage");
  const id = String(fd.get("id") ?? "");
  const t = await db.user.findFirst({ where: { id, hidden: false } });
  if (!t || t.id === actor.id) return;
  if (t.isOwner && !actor.isOwner) return;
  await db.user.update({ where: { id }, data: { totpEnabled: false, totpSecretEnc: null, totpLastStep: null, recoveryHashes: [], sessionVersion: { increment: 1 } } });
  await audit(actor, "staff.2fa.reset", "user", id, { name: t.name }, `${actor.name} reset two-factor login for ${t.name} (lost device) and signed them out`, { category: "security", level: "warn" });
  revalidatePath("/adm", "layout");
}
