"use client";

import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { resendVerification } from "@/actions/customer";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";

/** Friendly, non-blocking reminder: the account already works; confirming only unlocks earlier orders. */
export function VerifyBanner() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4">
      <div className="flex items-center gap-3">
        <MailCheck className="h-6 w-6 shrink-0 text-brand" />
        <div>
          <p className="font-bold">{t("account.verifyTitle")}</p>
          <p className="text-sm text-muted">{t("account.verifyText")}</p>
        </div>
      </div>
      {sent ? (
        <span className="text-sm font-semibold text-ok">{t("account.verifySent")}</span>
      ) : (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await resendVerification(); if (r.ok) setSent(true); })}>
          {pending && <Spinner />} {t("account.verifyResend")}
        </Button>
      )}
    </div>
  );
}
