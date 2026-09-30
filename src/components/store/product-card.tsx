"use client";

import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import type { ProductView } from "@/lib/catalog";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/i18n/client";
import { Badge } from "@/components/ui";
import { TiltCard } from "@/components/fx/tilt-card";
import { money } from "@/lib/utils";

export function ProductCard({ p }: { p: ProductView }) {
  const { t, locale } = useI18n();
  const { add } = useCart();
  const img = p.images[0]?.thumb ?? "/brand/placeholder.svg";
  const img2 = p.images[1]?.thumb;
  const single = p.variants.length === 1 ? p.variants[0] : null;
  const hasChoices = p.sizes.length > 0 || p.options.length > 0;
  const from = p.minPrice !== p.maxPrice;

  return (
    <TiltCard max={7} className="h-full rounded-2xl">
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-glow">
      <Link href={`/${locale}/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={p.images[0]?.alt || p.name} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-contain p-2 transition duration-500 ${img2 ? "group-hover:opacity-0" : "group-hover:scale-110"}`} />
        {img2 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img2} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-2 opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
        )}
        <div className="absolute start-2.5 top-2.5 flex flex-col gap-1.5">
          {p.offer ? <Badge tone="danger">{p.offer.badge}</Badge> : p.onSale && <Badge tone="danger">{t("common.sale")}</Badge>}
          {p.isNew && <Badge tone="accent">{t("common.new")}</Badge>}
          {!p.inStock && <Badge tone="muted">{t("common.outOfStock")}</Badge>}
          {p.lowStock > 0 && <Badge tone="warn">{t("common.lowStock", { n: p.lowStock })}</Badge>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {p.categories[0] && <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">{p.categories[0].name}</span>}
        <Link href={`/${locale}/product/${p.slug}`} className="line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-snug transition hover:text-brand">
          {p.name}
        </Link>

        {hasChoices && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            {p.sizes.length > 0 && <span className="rounded-md bg-surface-2 px-1.5 py-0.5">{p.sizes.map((s) => s.label).join(" · ")}</span>}
            {p.options.length > 0 && <span className="rounded-md bg-surface-2 px-1.5 py-0.5">{t("product.options", { n: p.options.length })}</span>}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            {from && <span className="block text-[11px] text-muted">{t("common.from")}</span>}
            <span className="text-lg font-black text-brand">{money(p.minPrice)}</span>
          </div>
          {single && single.stock > 0 && !hasChoices ? (
            <button
              onClick={() =>
                add({
                  variantId: single.id,
                  slug: p.slug,
                  name: p.name,
                  nameAr: p.name,
                  variantLabel: "",
                  variantLabelAr: "",
                  image: img,
                  price: single.price,
                  max: single.stock,
                })
              }
              aria-label={t("common.addToCart")}
              className="hover-wiggle flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-card transition hover:scale-110 hover:bg-accent-hover active:scale-90"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          ) : (
            <Link href={`/${locale}/product/${p.slug}`} aria-label={t("common.details")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition hover:scale-105">
              <Plus className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </article>
    </TiltCard>
  );
}

export function ProductGrid({ products }: { products: ProductView[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
