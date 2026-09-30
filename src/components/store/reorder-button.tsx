"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { getReorderLines } from "@/actions/reorder";

/** Puts the items of a past order back into the cart at today's prices (skips what is gone). */
export function ReorderButton({ code, k }: { code: string; k?: string }) {
  const { t } = useI18n();
  const { add } = useCart();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="text-center">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const { lines, skipped } = await getReorderLines(code, k);
            if (lines.length === 0) return setMsg(t("order.againNone"));
            lines.forEach(({ qty, ...line }) => add(line, qty));
            setMsg(skipped > 0 ? t("order.againSome") : "");
          })
        }
      >
        {pending ? <Spinner /> : <RotateCcw className="h-4 w-4" />} {t("order.again")}
      </Button>
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
