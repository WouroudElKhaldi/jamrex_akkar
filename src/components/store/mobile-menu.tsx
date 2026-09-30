"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { SearchBox } from "./search-box";
import { LangSwitch } from "@/components/lang-switch";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileMenu({ categories }: { categories: { slug: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const { t, locale, dir } = useI18n();
  const [mounted, setMounted] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => setMounted(true), []);
  // lock page scroll + Escape closes while the menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t("nav.menu")} className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      {mounted && createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" />
            <motion.nav
              initial={{ x: dir === "rtl" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 start-0 z-[80] flex w-[86%] max-w-sm flex-col gap-5 overflow-y-auto border-e border-border bg-surface p-5 shadow-glow"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-black">{t("nav.menu")}</span>
                <button onClick={close} aria-label={t("common.close")} className="rounded-lg p-2 hover:bg-surface-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SearchBox onDone={close} />
              <ul className="space-y-1 text-base font-semibold">
                <li>
                  <Link onClick={close} href={`/${locale}/shop`} className="block rounded-xl px-3 py-2.5 hover:bg-surface-2">{t("nav.allProducts")}</Link>
                </li>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link onClick={close} href={c.slug === "offers" ? `/${locale}/offers` : `/${locale}/category/${c.slug}`} className="block rounded-xl px-3 py-2.5 hover:bg-surface-2">{c.name}</Link>
                  </li>
                ))}
                <li>
                  <Link onClick={close} href={`/${locale}/track`} className="block rounded-xl px-3 py-2.5 hover:bg-surface-2">{t("nav.track")}</Link>
                </li>
                <li>
                  <Link onClick={close} href={`/${locale}/contact`} className="block rounded-xl px-3 py-2.5 hover:bg-surface-2">{t("nav.contact")}</Link>
                </li>
              </ul>
              <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
                <LangSwitch />
                <ThemeToggle />
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>,
      document.body)}
    </>
  );
}
