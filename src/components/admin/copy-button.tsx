"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui";

/** Copies a site-relative path as a full link. */
export function CopyButton({ path }: { path: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try { await navigator.clipboard.writeText(path.startsWith("http") ? path : location.origin + path); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
      }}
    >
      {done ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />} {done ? t("a.copied") : t("a.copyLink")}
    </Button>
  );
}
