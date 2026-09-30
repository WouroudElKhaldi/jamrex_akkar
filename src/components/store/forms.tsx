"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";
import { forgotPassword, loginCustomer, registerCustomer, setPassword, updateProfile, type FormState } from "@/actions/customer";
import { submitContact, trackOrder } from "@/actions/shop";

const errKey: Record<string, string> = { login: "account.invalidLogin", rate: "common.error", invalid: "common.error", phone: "account.emailTaken", short: "account.passwordShort", weak: "account.passwordWeak", exists: "account.emailExists", mismatch: "account.passwordMismatch", token: "account.tokenInvalid" };

function Err({ state }: { state: FormState }) {
  const { t } = useI18n();
  if (!state?.error) return null;
  return <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{t(errKey[state.error] || "common.error")}</p>;
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Spinner />} {children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(loginCustomer, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("account.email")}><Input name="email" type="email" required autoComplete="email" dir="ltr" /></Field>
      <Field label={t("account.password")}><Input name="password" type="password" required autoComplete="current-password" /></Field>
      <Err state={state} />
      <Submit pending={pending}>{t("account.loginBtn")}</Submit>
      <Link href={`/${locale}/account/forgot`} className="block text-center text-sm font-semibold text-brand hover:underline">{t("account.forgot")}</Link>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(registerCustomer, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("account.name")}><Input name="name" required autoComplete="name" /></Field>
      <Field label={t("account.email")}><Input name="email" type="email" required autoComplete="email" dir="ltr" /></Field>
      <Field label={t("account.phone")} hint={t("checkout.phoneHint")}><Input name="phone" type="tel" required autoComplete="tel" dir="ltr" /></Field>
      <Field label={t("account.password")} hint={t("account.passwordHint")}>
        <div className="relative">
          <Input name="password" type={show ? "text" : "password"} minLength={10} required autoComplete="new-password" className="pe-16" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-brand-soft">{show ? t("account.hide") : t("account.show")}</button>
        </div>
      </Field>
      <Err state={state} />
      <Submit pending={pending}>{t("account.registerBtn")}</Submit>
    </form>
  );
}

export function ForgotForm() {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(forgotPassword, null);
  if (state?.ok) return <p className="rounded-xl bg-ok/10 p-4 text-sm font-semibold text-ok">{t("account.linkSent")}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("account.email")}><Input name="email" type="email" required dir="ltr" /></Field>
      <Err state={state} />
      <Submit pending={pending}>{t("account.sendLink")}</Submit>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <Field label={t("account.newPassword")}><Input name="password" type="password" minLength={10} required autoComplete="new-password" /></Field>
      <Field label={t("account.confirmPassword")}><Input name="confirm" type="password" minLength={10} required autoComplete="new-password" /></Field>
      <Err state={state} />
      <Submit pending={pending}>{t("account.savePassword")}</Submit>
    </form>
  );
}

export function ProfileForm({ name, address }: { name: string; address: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateProfile, null);
  // submit programmatically so React does not reset the fields back to their old defaults after saving
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="space-y-4">
      <Field label={t("account.name")}><Input name="name" defaultValue={name} required /></Field>
      <Field label={t("checkout.address")}><Textarea name="address" defaultValue={address} rows={2} /></Field>
      <Err state={state} />
      {state?.ok && <p className="text-sm font-semibold text-ok">{t("account.savedOk")}</p>}
      <Button type="submit" disabled={pending}>{pending && <Spinner />} {t("common.save")}</Button>
    </form>
  );
}

export function TrackForm() {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(trackOrder, null);
  return (
    <Card className="mx-auto max-w-md p-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t("order.orderNumber")}><Input name="code" required dir="ltr" placeholder="JM-00012" /></Field>
        <Field label={t("checkout.phone")}><Input name="phone" type="tel" required dir="ltr" /></Field>
        {state?.error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{t("order.notFound")}</p>}
        <Submit pending={pending}>{t("order.find")}</Submit>
      </form>
    </Card>
  );
}

export function ContactForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(submitContact, null);
  if (state?.ok) return <p className="rounded-xl bg-ok/10 p-4 font-semibold text-ok">{t("contact.sent")}</p>;
  return (
    <form action={action} className="space-y-4">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("checkout.name")}><Input name="name" required /></Field>
        <Field label={t("checkout.phone")}><Input name="phone" type="tel" required dir="ltr" /></Field>
      </div>
      <Field label={`${t("checkout.email")} (${t("common.optional")})`}><Input name="email" type="email" dir="ltr" /></Field>
      <Field label={t("contact.message")}><Textarea name="message" required rows={4} /></Field>
      {state && !state.ok && <p className="text-sm font-semibold text-danger">{t("common.error")}</p>}
      <Submit pending={pending}>{t("contact.send")}</Submit>
    </form>
  );
}
