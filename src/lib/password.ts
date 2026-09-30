// Password rules. Staff can change prices, orders and other staff, so their bar is higher than customers'.

const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "qwerty", "qwerty123", "qwertyuiop", "123456", "1234567", "12345678", "123456789", "1234567890", "0123456789",
  "111111", "000000", "abc123", "abcd1234", "iloveyou", "admin", "admin123", "administrator", "welcome", "welcome1", "letmein", "monkey", "dragon", "football",
  "jamrex", "jamrex123", "jamrexminiyeh", "jamrex2026", "miniyeh", "lebanon", "lebanon123", "beirut", "changeme", "change-me", "trustno1", "master", "login",
]);

export type PasswordCheck = { ok: true } | { ok: false; reason: "short" | "common" | "weak" };

export function validatePassword(pw: string, opts: { min: number; identity?: string[] }): PasswordCheck {
  if (pw.length < opts.min) return { ok: false, reason: "short" };
  const lower = pw.toLowerCase();
  if (COMMON.has(lower) || COMMON.has(lower.replace(/[^a-z0-9]/g, ""))) return { ok: false, reason: "common" };
  for (const id of opts.identity ?? []) {
    const x = id.toLowerCase().split("@")[0];
    if (x.length >= 4 && lower.includes(x)) return { ok: false, reason: "weak" }; // contains their own name / email
  }
  if (/^(.)\1+$/.test(pw)) return { ok: false, reason: "weak" }; // aaaaaaaaaaaa
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length < 16 && classes < 3) return { ok: false, reason: "weak" }; // long passphrases are fine; short ones need variety
  return { ok: true };
}

export const STAFF_MIN = 12;
export const CUSTOMER_MIN = 10;
