"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { useDrawerClose } from "./data-table";

/**
 * Wraps a plain <form> whose `action` is a server action; shows a spinner while saving and a
 * short "Saved" confirmation afterwards. Children are the fields.
 */
export function SaveForm({ action, children, className, submitLabel, extra, resetOnSave }: { action: (fd: FormData) => Promise<void>; children: React.ReactNode; className?: string; submitLabel?: string; extra?: React.ReactNode; resetOnSave?: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const closeDrawer = useDrawerClose();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setFailed(false);
        start(async () => {
          try {
            await action(fd);
            setSaved(true);
            if (resetOnSave) form.reset();
            setTimeout(() => setSaved(false), 2000);
            if (closeDrawer) setTimeout(closeDrawer, 750);
          } catch {
            setFailed(true);
          }
        });
      }}
    >
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />} {submitLabel ?? t("a.save")}
        </Button>
        {extra}
        {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok"><Check className="h-4 w-4" /> {t("a.saved")}</span>}
        {failed && <span className="text-sm font-semibold text-danger">{t("a.failed")}</span>}
      </div>
    </form>
  );
}
