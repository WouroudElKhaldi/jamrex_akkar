"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useTransition } from "react";
import { setAdminLang } from "@/actions/admin/auth";
import { useI18n } from "@/i18n/client";

export function LangToggleAdmin() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setAdminLang(locale === "ar" ? "en" : "ar");
          router.refresh();
          // the <html lang/dir> comes from the root layout: reload once so it flips immediately
          window.location.reload();
        })
      }
      className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition hover:bg-surface-2"
    >
      <Languages className="h-4 w-4" /> {t("a.language")}
    </button>
  );
}
