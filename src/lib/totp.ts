import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";

// Two-factor login (RFC 6238 time-based one-time codes: Google Authenticator, Microsoft Authenticator, Authy, 1Password…).
// Free, offline, no third-party service.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function b32encode(buf: Buffer): string {
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}
function b32decode(s: string): Buffer {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export const newSecret = () => b32encode(crypto.randomBytes(20));

function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(buf).digest();
  const o = h[19] & 15;
  const code = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000;
  return String(code).padStart(6, "0");
}

const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Returns the matched 30-second step (so it can be remembered and never accepted twice), or null. Allows ±1 step of clock drift. */
export function verifyTotp(secret: string, token: string, lastStep?: number | null): number | null {
  const now = Math.floor(Date.now() / 30_000);
  for (const d of [-1, 0, 1]) {
    const step = now + d;
    if (lastStep != null && step <= lastStep) continue; // replay protection
    if (safeEq(hotp(secret, step), token)) return step;
  }
  return null;
}
/** Current code for a secret (used by automated tests only). */
export const currentCode = (secret: string) => hotp(secret, Math.floor(Date.now() / 30_000));

// ── the secret is stored encrypted (AES-256-GCM, key derived from AUTH_SECRET) so a database leak alone is not enough ──
const key = () => crypto.createHash("sha256").update("totp:" + (process.env.AUTH_SECRET || "")).digest();
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export const otpauthUri = (email: string, secret: string) =>
  `otpauth://totp/${encodeURIComponent("Jamrex Miniyeh")}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent("Jamrex Miniyeh")}&algorithm=SHA1&digits=6&period=30`;

// ── recovery codes: shown once, stored only as hashes, each works once ──
const hashCode = (c: string) => crypto.createHash("sha256").update(c.trim().toLowerCase()).digest("hex");
export function newRecoveryCodes(n = 8): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: n }, () => {
    const r = crypto.randomBytes(5).toString("hex");
    return `${r.slice(0, 5)}-${r.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashCode) };
}

type FactorUser = { id: string; totpSecretEnc: string | null; totpLastStep: number | null; recoveryHashes: string[] };

/** Checks a 6-digit code or a recovery code and consumes it. */
export async function consumeSecondFactor(u: FactorUser, raw: string): Promise<"totp" | "recovery" | null> {
  const input = (raw || "").trim();
  if (!input || !u.totpSecretEnc) return null;
  const digits = input.replace(/[\s-]/g, "");
  if (/^\d{6}$/.test(digits)) {
    const step = verifyTotp(decryptSecret(u.totpSecretEnc), digits, u.totpLastStep);
    if (step === null) return null;
    await db.user.update({ where: { id: u.id }, data: { totpLastStep: step } });
    return "totp";
  }
  const h = hashCode(input);
  if (u.recoveryHashes.includes(h)) {
    await db.user.update({ where: { id: u.id }, data: { recoveryHashes: u.recoveryHashes.filter((x) => x !== h) } });
    return "recovery";
  }
  return null;
}
