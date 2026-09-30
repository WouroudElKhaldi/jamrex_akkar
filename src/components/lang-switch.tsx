"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Swaps the /en or /ar prefix of the current storefront URL. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const sp = useSearchParams();
  const other = locale === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(en|ar)/, "") || "";
  const qs = sp.toString();
  return (
    <Link href={`/${other}${rest}${qs ? "?" + qs : ""}`} prefetch={false} className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition hover:bg-surface-2 ${className}`}>
      <Languages className="h-4 w-4" />
      {t("common.language")}
    </Link>
  );
}
