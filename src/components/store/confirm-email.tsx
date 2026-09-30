"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { confirmEmail } from "@/actions/customer";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";

export function ConfirmEmailButton({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<boolean | null>(null);
  if (result === true)
    return (
      <>
        <p className="font-semibold text-ok">{t("account.verifyOk")}</p>
        <Link href={`/${locale}/account`}><Button>{t("common.account")}</Button></Link>
      </>
    );
  return (
    <>
      {result === false && <p className="font-semibold text-danger">{t("account.verifyBad")}</p>}
      <Button size="lg" disabled={pending || !token} onClick={() => start(async () => setResult((await confirmEmail(token)).ok))}>
        {pending && <Spinner />} {t("account.verifyPage")}
      </Button>
    </>
  );
}
