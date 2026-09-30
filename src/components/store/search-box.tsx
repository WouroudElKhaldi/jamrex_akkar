"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

export function SearchBox({ className = "", onDone }: { className?: string; onDone?: () => void }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/${locale}/shop${q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""}`);
        onDone?.();
      }}
    >
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("common.search")}
        aria-label={t("common.search")}
        className="h-11 w-full rounded-xl border border-border bg-surface-2/60 ps-10 pe-3 text-sm transition placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
    </form>
  );
}
