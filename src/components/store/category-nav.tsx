"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Flame, LayoutGrid, MessageCircle, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavCat = { slug: string; name: string; image: string | null; count: number };
type Labels = { categories: string; all: string; track: string; contact: string; viewAll: string };

// small 480px version of an uploaded photo (created on first request), original for anything else
const thumb = (src: string | null) => (src && src.startsWith("/uploads/") && src.endsWith(".webp") && !src.endsWith("-sm.webp") ? src.slice(0, -5) + "-sm.webp" : src);

/**
 * Lives inside the main header row (desktop): a "Categories" mega-menu button, then All products / Offers.
 * `side` renders the Track / Contact shortcuts that sit next to the search box.
 * The panel is positioned against the header itself, so it drops right under the whole bar.
 */
export function CategoryNav({ locale, cats, labels, side = false }: { locale: string; cats: NavCat[]; labels: Labels; side?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offers = cats.find((c) => c.slug === "offers");
  const rest = cats.filter((c) => c.slug !== "offers");

  const later = useCallback((v: boolean, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(v), ms);
  }, []);
  const keep = () => { if (timer.current) clearTimeout(timer.current); };

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const link = "relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-surface-2";

  if (side) {
    return (
      <div className="hidden items-center gap-0.5 lg:flex">
        <Link href={`/${locale}/track`} title={labels.track} aria-label={labels.track} className={cn(link, "px-2.5 text-fg/80 hover:text-brand", isActive(`/${locale}/track`) && "text-brand")}>
          <PackageSearch className="h-5 w-5" /> <span className="hidden 2xl:inline">{labels.track}</span>
        </Link>
        <Link href={`/${locale}/contact`} title={labels.contact} aria-label={labels.contact} className={cn(link, "bg-brand-soft px-2.5 text-brand hover:bg-brand hover:text-brand-fg 2xl:px-3", isActive(`/${locale}/contact`) && "bg-brand text-brand-fg")}>
          <MessageCircle className="h-5 w-5" /> <span className="hidden xl:inline">{labels.contact}</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div ref={btn} className="hidden items-center gap-1 lg:flex" onMouseLeave={() => open && later(false, 220)} onMouseEnter={keep}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => later(true, 90)}
          className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-card transition", open ? "bg-brand text-brand-fg shadow-glow" : "bg-brand-soft text-brand hover:bg-brand hover:text-brand-fg")}
        >
          <LayoutGrid className="h-4 w-4" /> {labels.categories}
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} />
        </button>
        <Link href={`/${locale}/shop`} className={cn(link, isActive(`/${locale}/shop`) ? "text-brand" : "text-fg/80 hover:text-brand")}>{labels.all}</Link>
        {offers && (
          <Link href={`/${locale}/offers`} className={cn(link, "text-danger hover:text-danger", isActive(`/${locale}/offers`) && "bg-danger/10")}>
            <Flame className="h-4 w-4 animate-pulse" /> {offers.name}
          </Link>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={keep}
            onMouseLeave={() => later(false, 220)}
            className="absolute inset-x-0 top-full hidden border-y border-border bg-bg/95 shadow-2xl backdrop-blur-xl lg:block"
          >
            <div className="mx-auto max-w-[90rem] px-4 py-6 md:px-6">
              <ul className="grid grid-cols-3 gap-3 xl:grid-cols-4">
                {[...(offers ? [offers] : []), ...rest].map((c, i) => (
                  <motion.li key={c.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}>
                    <Link
                      href={c.slug === "offers" ? `/${locale}/offers` : `/${locale}/category/${c.slug}`}
                      className={cn("group flex items-center gap-3 rounded-2xl border p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow", c.slug === "offers" ? "border-danger/30 bg-danger/5 hover:border-danger/60" : "border-border bg-surface hover:border-brand/40")}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border transition group-hover:scale-105">
                        {c.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb(c.image) ?? ""} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Flame className="h-6 w-6 text-danger" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-bold", c.slug === "offers" && "text-danger")}>{c.name}</span>
                        <span className="text-xs text-muted">{c.count}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-brand opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 rtl:rotate-180 rtl:translate-x-1 rtl:group-hover:translate-x-0" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <Link href={`/${locale}/shop`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">{labels.viewAll} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
