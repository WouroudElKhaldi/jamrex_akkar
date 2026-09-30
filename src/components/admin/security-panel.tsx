"use client";

import { useState, useTransition } from "react";
import { Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Badge, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { beginTotp, confirmTotp, disableTotp, regenerateRecovery } from "@/actions/admin/security";

export function SecurityPanel({ enabled: initial, recoveryLeft }: { enabled: boolean; recoveryLeft: number }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(initial);
  const [pending, start] = useTransition();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const err = (e?: string) => setMsg(e === "password" ? t("a.secWrongPassword") : e === "rate" ? t("a.secRate") : t("a.secWrongCode"));

  // recovery codes are shown once, right after they are made
  if (codes) {
    return (
      <Card className="max-w-xl space-y-4 p-6">
        <h2 className="text-lg font-bold">{t("a.secCodesTitle")}</h2>
        <p className="text-sm text-muted">{t("a.secCodesHelp")}</p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-base font-bold" dir="ltr">
          {codes.map((c) => <li key={c} className="rounded-lg bg-surface-2 px-3 py-2 text-center">{c}</li>)}
        </ul>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}><Copy className="h-4 w-4" /> {t("a.copy")}</Button>
          <Button onClick={() => { setCodes(null); setSetup(null); setCode(""); }}>{t("a.secCodesDone")}</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl space-y-5 p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${enabled ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>{enabled ? <ShieldCheck className="h-6 w-6" /> : <ShieldOff className="h-6 w-6" />}</span>
        <div>
          <h2 className="text-lg font-bold">{t("a.sec2faTitle")}</h2>
          <p className="text-sm text-muted">{enabled ? t("a.sec2faOn") : t("a.sec2faOff")}</p>
        </div>
      </div>

      {!enabled && !setup && (
        <Button disabled={pending} onClick={() => start(async () => { setMsg(""); const r = await beginTotp(); if (r.ok) setSetup({ secret: r.secret, qr: r.qr }); })}>
          {pending && <Spinner />} {t("a.secStart")}
        </Button>
      )}

      {!enabled && setup && (
        <div className="space-y-4">
          <p className="text-sm font-semibold">{t("a.secScan")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR" width={220} height={220} className="rounded-xl border border-border bg-white p-2" />
          <p className="text-xs text-muted">{t("a.secManual")} <code className="select-all rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm font-bold" dir="ltr">{setup.secret}</code></p>
          <Field label={t("a.secEnter")}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} dir="ltr" placeholder="123456" className="max-w-40 text-center font-mono text-lg tracking-widest" />
          </Field>
          <Button disabled={pending || code.replace(/\s/g, "").length < 6} onClick={() => start(async () => { setMsg(""); const r = await confirmTotp(code); if (r.ok) { setEnabled(true); setCodes(r.codes); setCode(""); } else err(r.error); })}>
            {pending && <Spinner />} {t("a.secConfirm")}
          </Button>
        </div>
      )}

      {enabled && (
        <div className="space-y-4 border-t border-border pt-4">
          <p className="text-sm text-muted">{recoveryLeft} × {t("a.secCodesTitle")}</p>
          <Field label={t("a.codeLabel")}><Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" dir="ltr" placeholder="123456" className="max-w-52" /></Field>
          <Field label={t("a.password")} hint={t("a.secDisableHelp")}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="max-w-64" /></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending || !code} onClick={() => start(async () => { setMsg(""); const r = await regenerateRecovery(code); if (r.ok) { setCodes(r.codes); setCode(""); } else err(r.error); })}>{t("a.secRegen")}</Button>
            <Button variant="danger" disabled={pending || !code || !password} onClick={() => start(async () => { setMsg(""); const r = await disableTotp(password, code); if (r.ok) { setEnabled(false); setSetup(null); setCode(""); setPassword(""); } else err(r.error); })}>{t("a.secDisable")}</Button>
          </div>
        </div>
      )}
      {msg && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{msg}</p>}
      {enabled && <Badge tone="ok">2FA ✓</Badge>}
    </Card>
  );
}
