"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const toggle = () => {
    const el = document.documentElement;
    const dark = !el.classList.contains("dark");
    el.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} aria-label={t("common.theme")} title={t("common.theme")} className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-surface-2 ${className}`}>
      <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </button>
  );
}
