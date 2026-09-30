"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { staffLogin } from "@/actions/admin/auth";
import { useI18n } from "@/i18n/client";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggleAdmin } from "@/components/admin/admin-toggles";

export function LoginFormAdmin() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(staffLogin, null);
  // controlled, so the email/password are still there when the code box appears
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const needCode = state?.error === "code" || state?.error === "badcode";
  return (
    <Card className="w-full max-w-sm p-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white"><Lock className="h-6 w-6" /></span>
        <div className="flex"><LangToggleAdmin /><ThemeToggle /></div>
      </div>
      <h1 className="mb-6 text-2xl font-black">{t("a.login")}</h1>
      <form action={action} className="space-y-4">
        <Field label={t("a.email")}><Input name="email" type="email" required autoComplete="username" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={needCode} /></Field>
        <Field label={t("a.password")}><Input name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} readOnly={needCode} /></Field>
        {needCode && (
          <Field label={t("a.codeLabel")} hint={t("a.codeHint")}>
            <Input name="code" inputMode="text" autoComplete="one-time-code" autoFocus required dir="ltr" placeholder="123456" />
          </Field>
        )}
        {state?.error === "code" && <p className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-brand">{t("a.codeNeeded")}</p>}
        {state?.error === "badcode" && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{t("a.badCode")}</p>}
        {(state?.error === "bad" || state?.error === "locked") && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{state.error === "locked" ? t("a.locked") : t("a.badLogin")}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending && <Spinner />} {t("a.signIn")}</Button>
      </form>
    </Card>
  );
}
