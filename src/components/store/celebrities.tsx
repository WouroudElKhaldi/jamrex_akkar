"use client";

import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

/** "Trusted by top celebrities": a slow, endless strip of portrait cards. Hover pauses it; reduced-motion users get a normal scroll. */
export function Celebrities({ title, text, images }: { title: string; text: string; images: string[] }) {
  const cards = (suffix: string) =>
    images.map((src, i) => (
      <div key={suffix + i} className="celeb-card relative h-72 w-56 shrink-0 overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition duration-500 hover:z-10 hover:-translate-y-2 hover:scale-[1.04] hover:shadow-glow md:h-80 md:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover transition duration-700 hover:scale-110" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand backdrop-blur"><BadgeCheck className="h-3.5 w-3.5" /> Jamrex</span>
      </div>
    ));

  return (
    <section className="cv-auto overflow-hidden py-12 md:py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mx-auto mb-9 max-w-2xl px-4 text-center">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
        {text && <p className="mt-3 text-lg text-muted">{text}</p>}
        <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />
      </motion.div>

      <div className="celeb-mask relative">
        <div className="celeb-track flex w-max">
          <div className="flex gap-4 pe-4">{cards("a")}</div>
          <div className="flex gap-4 pe-4" aria-hidden>{cards("b")}</div>
        </div>
      </div>
    </section>
  );
}
