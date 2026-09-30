"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { retryWhishPayment } from "@/actions/shop";

export function PayNowButton({ orderId, k }: { orderId: string; k: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  return (
    <>
      <Button
        variant="accent"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryWhishPayment(orderId, k);
            if (r.ok && r.url) window.location.href = r.url;
            else setErr(true);
          })
        }
      >
        {pending && <Spinner />} {t("order.payNow")}
      </Button>
      {err && <p className="mt-2 text-sm text-danger">{t("common.error")}</p>}
    </>
  );
}
