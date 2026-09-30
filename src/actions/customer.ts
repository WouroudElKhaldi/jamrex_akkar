"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";
import { checkPassword, customerAuth, getCustomer, hashPassword, randomToken, sha256, throttle } from "@/lib/auth";
import { sendAccountEmail } from "@/lib/notify";
import { log } from "@/lib/audit";
import { CUSTOMER_MIN, validatePassword } from "@/lib/password";
import { isLocale, isValidPhone, normalizeEmail, normalizePhone, siteUrl, type Locale } from "@/lib/utils";

export type FormState = { error?: string; ok?: boolean; message?: string } | null;

const loc = (fd: FormData): Locale => (isLocale(String(fd.get("locale"))) ? (String(fd.get("locale")) as Locale) : "en");
const ipOf = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

async function sendLink(customerId: string, email: string, type: "VERIFY" | "RESET", locale: Locale) {
  const token = randomToken();
  await db.authToken.deleteMany({ where: { customerId, type } });
  await db.authToken.create({ data: { customerId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } });
  const url = `${siteUrl()}/${locale}/account/set-password?token=${token}`;
  const ar = locale === "ar";
  const subject = ar ? "جامركس المنية: عيّن كلمة المرور" : "Jamrex Miniyeh: set your password";
  const text = ar ? `اضغط على الرابط لتعيين كلمة المرور (صالح 24 ساعة):\n${url}` : `Click the link to set your password (valid for 24 hours):\n${url}`;
  await sendAccountEmail(email, subject, text).catch((e) => console.error("email failed", e));
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  password: z.string().min(CUSTOMER_MIN).max(100),
});

/** Optional e-mail confirmation: never blocks the customer, it only unlocks earlier orders and proves the address is theirs. */
async function sendVerifyEmail(customerId: string, email: string, locale: Locale) {
  const token = randomToken();
  await db.authToken.deleteMany({ where: { customerId, type: "VERIFY_EMAIL" } });
  await db.authToken.create({ data: { customerId, type: "VERIFY_EMAIL", tokenHash: sha256(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) } });
  const url = `${siteUrl()}/${locale}/account/verify?token=${token}`;
  const ar = locale === "ar";
  await sendAccountEmail(
    email,
    ar ? "جامركس المنية: أكّد بريدك الإلكتروني" : "Jamrex Miniyeh: confirm your email",
    ar ? `مرحبًا! اضغط للتأكيد وعرض طلباتك السابقة:\n${url}` : `Welcome! Confirm your email to see your earlier orders:\n${url}`,
  ).catch((e) => console.error("email failed", e));
}

/** Creates the account right away (no waiting for an e-mail) and signs the customer in. */
export async function registerCustomer(_: FormState, fd: FormData): Promise<FormState> {
  const locale = loc(fd);
  if (!throttle(`reg:${await ipOf()}`, 8, 15 * 60_000)) return { error: "rate" };
  const p = registerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.path[0] === "password" ? "short" : "invalid" };
  const email = normalizeEmail(p.data.email);
  const phone = normalizePhone(p.data.phone);
  if (!isValidPhone(phone)) return { error: "invalid" };
  const strength = validatePassword(p.data.password, { min: CUSTOMER_MIN, identity: [p.data.name, email] });
  if (!strength.ok) return { error: strength.reason === "short" ? "short" : "weak" };

  const existing = await db.customer.findUnique({ where: { email } });
  if (existing?.passwordHash) return { error: "exists" }; // already has an account: they should log in

  const phoneOwner = await db.customer.findUnique({ where: { phone } });
  if (phoneOwner && phoneOwner.id !== existing?.id) return { error: "phone" };

  const passwordHash = await hashPassword(p.data.password);
  let customer;
  if (existing) {
    // this e-mail ordered as a guest before. The person is claiming that record, but is NOT yet proven to own the e-mail,
    // so the old name/address are replaced and the old orders stay hidden until the e-mail is verified.
    customer = await db.customer.update({ where: { id: existing.id }, data: { name: p.data.name, phone, address: null, zoneId: null, passwordHash, accountCreatedAt: new Date(), emailVerifiedAt: null } });
  } else {
    customer = await db.customer.create({ data: { email, phone, name: p.data.name, passwordHash, accountCreatedAt: new Date() } });
  }
  await sendVerifyEmail(customer.id, email, locale);
  await log({ actor: `Customer: ${email}`, action: "customer.register", entity: "customer", entityId: customer.id, category: "customer", summary: `${p.data.name} (${email}) created an account${existing ? " (had ordered as a guest before; earlier orders hidden until the email is verified)" : ""}` });

  try {
    await customerAuth.signIn("customer", { email, password: p.data.password, redirect: false });
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
  }
  const next = String(fd.get("next") || "");
  redirect(/^\/(?![\/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(next) ? next : `/${locale}/account`);
}

export async function resendVerification(): Promise<{ ok: boolean }> {
  const c = await getCustomer();
  if (!c || c.emailVerifiedAt) return { ok: false };
  if (!throttle(`verify:${c.id}`, 3, 60 * 60_000)) return { ok: false };
  await sendVerifyEmail(c.id, c.email, "en");
  return { ok: true };
}

/** Called from the confirmation page button (a button, so e-mail scanners that open links cannot use up the token). */
export async function confirmEmail(token: string): Promise<{ ok: boolean }> {
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token || "") } });
  if (!row || row.type !== "VERIFY_EMAIL" || row.usedAt || row.expiresAt < new Date()) {
    await log({ actor: "Visitor", action: "security.token.invalid", entity: "customer", category: "security", level: "warn", summary: "An invalid or expired email-confirmation link was used" });
    return { ok: false };
  }
  const cu = await db.customer.update({ where: { id: row.customerId }, data: { emailVerifiedAt: new Date() } });
  await db.authToken.deleteMany({ where: { customerId: row.customerId, type: "VERIFY_EMAIL" } });
  await log({ actor: `Customer: ${cu.email}`, action: "customer.email.verified", entity: "customer", entityId: cu.id, category: "customer", summary: `${cu.email} confirmed their email address` });
  return { ok: true };
}

export async function forgotPassword(_: FormState, fd: FormData): Promise<FormState> {
  const locale = loc(fd);
  if (!throttle(`forgot:${await ipOf()}`, 6, 15 * 60_000)) return { error: "rate" };
  const email = normalizeEmail(String(fd.get("email") || ""));
  const c = email ? await db.customer.findUnique({ where: { email } }) : null;
  if (c) {
    await sendLink(c.id, email, "RESET", locale);
    await log({ actor: `Customer: ${email}`, action: "customer.password.reset-requested", entity: "customer", entityId: c.id, category: "customer", summary: `Password reset link requested for ${email}` });
  }
  return { ok: true }; // same answer whether or not the account exists
}

const pwSchema = z.object({ password: z.string().min(CUSTOMER_MIN).max(100), confirm: z.string() });

export async function setPassword(_: FormState, fd: FormData): Promise<FormState> {
  const locale = loc(fd);
  const token = String(fd.get("token") || "");
  const p = pwSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "short" };
  if (p.data.password !== p.data.confirm) return { error: "mismatch" };
  const strength = validatePassword(p.data.password, { min: CUSTOMER_MIN });
  if (!strength.ok) return { error: strength.reason === "short" ? "short" : "weak" };

  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    await log({ actor: "Visitor", action: "security.token.invalid", entity: "customer", category: "security", level: "warn", summary: "An invalid or expired password link was used" });
    return { error: "token" };
  }

  const [customer] = await db.$transaction([
    db.customer.update({ where: { id: row.customerId }, data: { passwordHash: await hashPassword(p.data.password), emailVerifiedAt: new Date() } }),
    db.authToken.deleteMany({ where: { customerId: row.customerId } }),
  ]);
  await log({ actor: `Customer: ${customer.email}`, action: "customer.password.set", entity: "customer", entityId: customer.id, category: "customer", summary: `${customer.email} set a password and verified their email` });
  try {
    await customerAuth.signIn("customer", { email: customer.email, password: p.data.password, redirect: false });
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
  }
  redirect(`/${locale}/account`);
}

export async function loginCustomer(_: FormState, fd: FormData): Promise<FormState> {
  const locale = loc(fd);
  const email = normalizeEmail(String(fd.get("email") || ""));
  const password = String(fd.get("password") || "");
  if (!throttle(`clogin:${await ipOf()}`, 10, 10 * 60_000) || !throttle(`clogin:${email}`, 8, 10 * 60_000)) {
    await log({ actor: `Customer: ${email || "unknown"}`, action: "security.rate-limit", entity: "customer", category: "security", level: "warn", summary: `Too many customer sign-in attempts for ${email || "an unknown email"} were blocked` });
    return { error: "rate" };
  }
  try {
    await customerAuth.signIn("customer", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      await log({ actor: `Customer: ${email}`, action: "customer.login.failed", entity: "customer", category: "security", level: "warn", summary: `Failed customer sign-in for ${email}` });
      return { error: "login" };
    }
    throw e;
  }
  await log({ actor: `Customer: ${email}`, action: "customer.login", entity: "customer", category: "customer", summary: `${email} signed in` });
  const next = String(fd.get("next") || "");
  // only ever redirect to a path on this site (blocks //evil.com and /\evil.com tricks)
  redirect(/^\/(?![\/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(next) ? next : `/${locale}/account`);
}

export async function logoutCustomer(fd: FormData) {
  const who = await getCustomer();
  if (who) await log({ actor: `Customer: ${who.email}`, action: "customer.logout", entity: "customer", entityId: who.id, category: "customer", summary: `${who.email} signed out` });
  await customerAuth.signOut({ redirect: false });
  redirect(`/${loc(fd)}`);
}

const profileSchema = z.object({ name: z.string().trim().min(2).max(100), address: z.string().trim().max(400).optional() });

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const c = await getCustomer();
  if (!c) return { error: "login" };
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  await db.customer.update({ where: { id: c.id }, data: { name: p.data.name, address: p.data.address || null } });
  return { ok: true };
}
