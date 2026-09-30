"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useAdminBase } from "./admin-context";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { changeMyPassword, updateMyProfile, type ProfileState } from "@/actions/admin/profile";

const ERR: Record<string, string> = { invalid: "a.failed", rate: "a.locked", mismatch: "a.passwordMismatch", current: "a.wrongCurrent", short: "a.passwordShort", weak: "a.passwordWeak" };

export function ProfileForms({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();
  const base = useAdminBase();
  const [ps, pAction, pPending] = useActionState<ProfileState, FormData>(updateMyProfile, null);
  const [ws, wAction, wPending] = useActionState<ProfileState, FormData>(changeMyPassword, null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (ws?.relogin) {
      const id = setTimeout(() => { window.location.href = base + "/login"; }, 1400);
      return () => clearTimeout(id);
    }
  }, [ws, base]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><UserRound className="h-5 w-5 text-brand" /> {t("a.profile")}</h2>
        <form action={pAction} className="space-y-4">
          <Field label={t("a.name")}><Input name="name" defaultValue={name} required minLength={2} /></Field>
          <Field label={t("a.email")}><Input value={email} readOnly dir="ltr" className="opacity-70" /></Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pPending}>{pPending && <Spinner />} {t("a.save")}</Button>
            {ps?.ok && <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok"><Check className="h-4 w-4" /> {t("a.saved")}</span>}
            {ps?.error && <span className="text-sm font-semibold text-danger">{t(ERR[ps.error] || "a.failed")}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-brand" /> {t("a.changePassword")}</h2>
        <form action={wAction} className="space-y-4" autoComplete="off">
          <Field label={t("a.currentPassword")}><Input name="current" type={show ? "text" : "password"} required autoComplete="current-password" /></Field>
          <Field label={t("a.newPassword")} hint={t("a.passwordShort")}><Input name="next" type={show ? "text" : "password"} required minLength={12} autoComplete="new-password" /></Field>
          <Field label={t("a.confirmPassword")}><Input name="confirm" type={show ? "text" : "password"} required minLength={12} autoComplete="new-password" /></Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={wPending}>{wPending && <Spinner />} {t("a.changePassword")}</Button>
            <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            {ws?.ok && <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok"><Check className="h-4 w-4" /> {t("a.passwordChanged")}</span>}
            {ws?.error && <span className="text-sm font-semibold text-danger">{t(ERR[ws.error] || "a.failed")}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
