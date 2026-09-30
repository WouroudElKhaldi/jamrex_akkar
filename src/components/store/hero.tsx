"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, Hand, ShieldCheck, Sparkles, Truck, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui";
import { Magnetic } from "@/components/fx/magnetic";
import { Bubbles } from "@/components/fx/bubbles";

type Props = {
  badge: string;
  title: string;
  subtitle: string;
  cta1: { text: string; href: string };
  cta2: { text: string; href: string };
  image?: string;
  floating: string[];
  chips: string[];
};

const SLOTS = [
  { pos: "start-[2%] top-[8%] h-[46%] w-[46%]", depth: 28, rot: -7 },
  { pos: "end-[0%] top-[22%] h-[52%] w-[52%]", depth: 46, rot: 6 },
  { pos: "start-[20%] bottom-[0%] h-[42%] w-[42%]", depth: 64, rot: -3 },
  { pos: "end-[8%] bottom-[2%] h-[26%] w-[26%]", depth: 84, rot: 10 },
];

function Floater({ src, i, mx, my }: { src: string; i: number; mx: MotionValue<number>; my: MotionValue<number> }) {
  const s = SLOTS[i % SLOTS.length];
  // pointer parallax: nearer cards move more
  const x = useTransform(mx, [-1, 1], [-s.depth, s.depth]);
  const y = useTransform(my, [-1, 1], [-s.depth * 0.7, s.depth * 0.7]);
  return (
    <motion.div style={{ x, y }} className={`absolute z-10 ${s.pos}`}>
      <motion.div
        drag
        dragSnapToOrigin
        dragElastic={0.35}
        dragTransition={{ bounceStiffness: 260, bounceDamping: 14 }}
        whileHover={{ scale: 1.06, rotate: s.rot * 0.4 }}
        whileDrag={{ scale: 1.14, rotate: s.rot * 1.8, zIndex: 40, cursor: "grabbing" }}
        initial={{ opacity: 0, y: 60, rotate: s.rot * 2 }}
        animate={{ opacity: 1, y: 0, rotate: s.rot }}
        transition={{ delay: 0.35 + i * 0.14, type: "spring", stiffness: 120, damping: 14 }}
        className="h-full w-full cursor-grab touch-none"
      >
        <div className="animate-float-slow h-full w-full rounded-3xl bg-white/95 p-3 shadow-glow ring-1 ring-black/5" style={{ animationDelay: `${i * 1.1}s` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Hero({ badge, title, subtitle, cta1, cta2, image, floating, chips }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const words = title.split(" ");
  const safe = (h: string) => (h.startsWith("/") && !h.startsWith("//")) || /^https?:\/\//.test(h) ? h : "/";
  const chipIcons = [ShieldCheck, Truck, Wallet, Sparkles];

  // normalised pointer position over the hero: -1 … 1
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useSpring(px, { stiffness: 70, damping: 18 });
  const my = useSpring(py, { stiffness: 70, damping: 18 });
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(40);
  const spot = useMotionTemplate`radial-gradient(520px circle at ${spotX}% ${spotY}%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)`;

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx * 2 - 1);
    py.set(ny * 2 - 1);
    spotX.set(nx * 100);
    spotY.set(ny * 100);
  };

  return (
    <section ref={ref} onPointerMove={onMove} className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-brand-soft via-bg to-accent-soft" />
      <motion.div aria-hidden style={{ background: spot }} className="absolute inset-0 -z-10" />
      <motion.div aria-hidden className="absolute -start-24 -top-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-brand/25 blur-3xl" animate={{ x: [0, 50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="absolute -bottom-24 end-0 -z-10 h-[26rem] w-[26rem] rounded-full bg-accent/30 blur-3xl" animate={{ x: [0, -50, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]" />
      <Bubbles count={18} />

      <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 py-14 md:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative z-10">
          <motion.span initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-xs font-bold text-accent shadow-card">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> {badge}
          </motion.span>

          <h1 className="mt-5 text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            {words.map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.08 * i + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.06 }}
                className={`me-[0.25em] inline-block ${i % 5 === 3 ? "text-shimmer" : ""}`}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {subtitle}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-8 flex flex-wrap gap-3">
            <Magnetic>
              <Link href={safe(cta1.href)}>
                <Button size="lg" variant="primary" className="shadow-glow">
                  {cta1.text} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
                </Button>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href={safe(cta2.href)}>
                <Button size="lg" variant="outline">{cta2.text}</Button>
              </Link>
            </Magnetic>
          </motion.div>

          <motion.ul initial="hidden" animate="show" transition={{ staggerChildren: 0.1, delayChildren: 0.95 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-muted">
            {chips.map((c, i) => {
              const Icon = chipIcons[i % chipIcons.length];
              return (
                <motion.li key={i} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }} whileHover={{ y: -3, color: "var(--fg)" }} className="inline-flex cursor-default items-center gap-2">
                  <Icon className="h-4 w-4 text-accent" /> {c}
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        {/* interactive stage */}
        <div className="relative mx-auto aspect-square w-full max-w-lg">
          <motion.div initial={{ scale: 0.7, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand to-accent shadow-glow" />
          <motion.div aria-hidden className="absolute inset-0 rounded-full border-2 border-dashed border-brand/25" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
          {image ? (
            <motion.img initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} src={image} alt="" className="absolute inset-0 z-10 h-full w-full object-contain p-6 drop-shadow-2xl" />
          ) : (
            floating.slice(0, 4).map((src, i) => <Floater key={src} src={src} i={i} mx={mx} my={my} />)
          )}
          {!image && floating.length > 0 && (
            <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, type: "spring" }} className="absolute -bottom-3 start-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-xs font-bold shadow-glow rtl:translate-x-1/2">
              <Hand className="h-4 w-4 animate-bounce text-accent" /> {t("common.dragHint")}
            </motion.span>
          )}
        </div>
      </div>
    </section>
  );
}
