"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TiltCard } from "@/components/fx/tilt-card";
import { useI18n } from "@/i18n/client";

// Bold colour per category (rotates); "offers" is always the hot coral one.
const GRADIENTS = [
  "from-[#1b45d6] to-[#5b86ff]",
  "from-[#0a9788] to-[#1fd3bd]",
  "from-[#5b3fd6] to-[#9a7bff]",
  "from-[#0b6fb8] to-[#38b6ff]",
  "from-[#0f3fae] to-[#2fa6a0]",
  "from-[#7a3fd6] to-[#ff7ac6]",
];
const HOT = "from-[#e0451f] to-[#ff9a5c]";

/** Colour card with the product on a white "sticker" that lifts and straightens on hover. Tilts with the mouse. */
export function CategoryTile({ slug, name, image, count, index }: { slug: string; name: string; image: string | null; count: number; index: number }) {
  const { locale, t } = useI18n();
  const href = slug === "offers" ? `/${locale}/offers` : `/${locale}/category/${slug}`;
  const grad = slug === "offers" ? HOT : GRADIENTS[index % GRADIENTS.length];
  const tilt = index % 2 === 0 ? "-rotate-3" : "rotate-3";

  return (
    <TiltCard max={9} className="h-full rounded-[1.75rem]">
      <Link href={href} className={`group relative flex aspect-[4/5] h-full flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${grad} p-4 text-white shadow-card transition-shadow duration-300 hover:shadow-glow`}>
        {/* decoration */}
        <span aria-hidden className="absolute -end-12 -top-12 h-44 w-44 rounded-full bg-white/15 transition duration-500 group-hover:scale-125" />
        <span aria-hidden className="absolute -bottom-16 -start-10 h-40 w-40 rounded-full bg-black/10 transition duration-500 group-hover:scale-125" />
        <span aria-hidden className="absolute start-6 top-24 h-3 w-3 rounded-full bg-white/50 transition duration-500 group-hover:-translate-y-4" />
        <span aria-hidden className="absolute end-10 top-40 h-2 w-2 rounded-full bg-white/60 transition duration-700 group-hover:-translate-y-6" />

        <div className="relative mx-auto flex w-[80%] flex-1 items-center justify-center py-1">
          <div className={`h-full w-full rounded-2xl bg-white p-2 shadow-2xl ring-4 ring-white/30 transition duration-500 ease-out ${tilt} group-hover:-translate-y-2 group-hover:rotate-0 group-hover:scale-[1.06]`}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-6xl font-black text-brand/40">{name.slice(0, 1)}</span>
            )}
          </div>
        </div>

        <div className="relative mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black leading-tight drop-shadow-sm md:text-2xl">{name}</h3>
            <p className="mt-0.5 text-xs font-bold text-white/80">{count} {t("home.statProducts")}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-brand">
            <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" />
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}
