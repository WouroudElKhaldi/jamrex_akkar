"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/client";

/**
 * "See it in action": a cinematic video card. Nothing from YouTube loads until the visitor presses play
 * (faster page, no tracking); the player then replaces the poster and starts by itself.
 */
export function VideoShowcase({ videoId, poster, badge, title, text, cta }: { videoId: string; poster?: string; badge: string; title: string; text: string; cta?: { text: string; href: string } }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);

  return (
    <section className="cv-auto mx-auto max-w-[90rem] px-4 md:px-6 py-8 md:py-12">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1437] via-[#132a7a] to-[#1b45d6] p-6 text-white shadow-glow md:p-12">
        {/* drifting light blobs */}
        <div className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 animate-float-slow rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 end-10 h-80 w-80 animate-float-slow rounded-full bg-white/10 blur-3xl [animation-delay:-3.5s]" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:gap-12">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold backdrop-blur"><Sparkles className="h-4 w-4 text-accent" /> {badge}</span>
            <h2 className="text-3xl font-black leading-tight md:text-4xl lg:text-5xl">{title}</h2>
            <p className="max-w-md text-lg leading-relaxed text-white/80">{text}</p>
            {cta && (
              <Link href={cta.href} className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-brand shadow-card transition hover:gap-3.5 hover:shadow-glow">
                {cta.text} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="relative">
            {/* spinning gradient ring behind the player */}
            <div className="absolute -inset-1 overflow-hidden rounded-[1.75rem]">
              <div className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-[spin_9s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,var(--accent)_90deg,transparent_180deg,#fff_270deg,transparent_360deg)] opacity-70" />
            </div>
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-2xl">
              {playing ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title={title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <button type="button" onClick={() => setPlaying(true)} aria-label={t("common.vidPlay")} className="group absolute inset-0 block h-full w-full cursor-pointer">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-brand to-accent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition group-hover:from-black/40" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-white/50" />
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-brand shadow-glow transition duration-300 group-hover:scale-110 md:h-24 md:w-24">
                      <Play className="h-9 w-9 translate-x-0.5 fill-current rtl:-translate-x-0.5 rtl:-scale-x-100 md:h-10 md:w-10" />
                    </span>
                  </span>
                  <span className="absolute bottom-4 start-4 rounded-full bg-black/55 px-3.5 py-1.5 text-sm font-bold backdrop-blur">{t("common.vidWatch")}</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
