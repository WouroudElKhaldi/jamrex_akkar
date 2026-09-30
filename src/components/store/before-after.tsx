"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { ArrowRight, ChevronsLeftRight } from "lucide-react";
import { useI18n } from "@/i18n/client";

export type CompareItem = { title: string; before: string; after: string; href?: string };

/** One slider: drag (mouse, finger) or use the arrow keys to move the divider and reveal the "after" photo. */
function Compare({ item }: { item: CompareItem }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { once: true, margin: "-60px" });
  const [pos, setPos] = useState(100); // % of the photo that still shows "before"
  const touched = useRef(false);
  const dragging = useRef(false);

  // little reveal when it scrolls into view, to show that it can be moved
  useEffect(() => {
    if (!seen || touched.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (seen && !touched.current) setPos(50);
      return;
    }
    const a = animate(100, 50, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => !touched.current && setPos(v) });
    return () => a.stop();
  }, [seen]);

  const moveTo = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <motion.article initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition hover:shadow-glow">
      {/* dir=ltr on purpose: "before" is always on the left, "after" on the right, in both languages */}
      <div
        ref={box}
        dir="ltr"
        className="relative aspect-[4/3] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-surface-2"
        onPointerDown={(e) => { touched.current = true; dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveTo(e.clientX); }}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.after} alt={`${item.title} – ${t("common.cmpAfter")}`} draggable={false} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.before} alt={`${item.title} – ${t("common.cmpBefore")}`} draggable={false} loading="lazy" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} className="absolute inset-0 h-full w-full object-cover" />

        <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur" style={{ opacity: pos > 12 ? 1 : 0, transition: "opacity .2s" }}>{t("common.cmpBefore")}</span>
        <span className="pointer-events-none absolute end-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-fg shadow-card" style={{ opacity: pos < 88 ? 1 : 0, transition: "opacity .2s" }}>{t("common.cmpAfter")}</span>

        {/* divider + knob */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)]" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand shadow-glow ring-4 ring-white/40 transition-transform group-hover:scale-110">
            <ChevronsLeftRight className="h-6 w-6" />
          </span>
        </div>

        {/* keyboard / screen-reader control */}
        <input type="range" min={0} max={100} step={1} value={Math.round(pos)} onChange={(e) => { touched.current = true; setPos(Number(e.target.value)); }} aria-label={`${item.title}: ${t("common.cmpHint")}`} className="sr-only" />
      </div>

      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <h3 className="text-lg font-black leading-snug">{item.title}</h3>
          <p className="text-xs font-semibold text-muted">← {t("common.cmpHint")} →</p>
        </div>
        {item.href && (
          <Link href={item.href} aria-label={t("common.cmpShop")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-card transition hover:scale-110 hover:bg-brand-hover hover:shadow-glow">
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}

export function BeforeAfter({ title, text, items }: { title: string; text: string; items: CompareItem[] }) {
  return (
    <section className="cv-auto relative overflow-hidden bg-gradient-to-b from-transparent via-brand-soft/50 to-transparent py-12 md:py-16">
      <div className="mx-auto max-w-[90rem] px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
          <p className="mt-3 text-lg text-muted">{text}</p>
          <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => <Compare key={it.title + it.before} item={it} />)}
        </div>
      </div>
    </section>
  );
}
