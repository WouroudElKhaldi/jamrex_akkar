"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import type { ProductView } from "@/lib/catalog";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/i18n/client";
import { Badge, Button } from "@/components/ui";
import { cn, money } from "@/lib/utils";

const KIND_KEY: Record<string, string> = { SCENT: "product.scent", COLOR: "product.color", TYPE: "product.type" };

export function ProductDetail({ p, whatsapp, arName }: { p: ProductView; whatsapp: string; arName: string }) {
  const { t, locale } = useI18n();
  const { add } = useCart();

  const [sizeId, setSizeId] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0].id : null);
  const [optionId, setOptionId] = useState<string | null>(p.options.length === 1 ? p.options[0].id : null);
  const [imgId, setImgId] = useState<string | null>(p.images[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const needSize = p.sizes.length > 0;
  const needOption = p.options.length > 0;

  const variant = useMemo(() => {
    if (needSize && !sizeId) return null;
    if (needOption && !optionId) return null;
    return p.variants.find((v) => v.sizeId === (needSize ? sizeId : null) && v.optionId === (needOption ? optionId : null)) ?? null;
  }, [p.variants, sizeId, optionId, needSize, needOption]);

  // Is there any variant with this size / option combination available?
  const optionAvailable = (oid: string) => p.variants.some((v) => v.optionId === oid && (!sizeId || v.sizeId === sizeId) && v.stock > 0);
  const sizeAvailable = (sid: string) => p.variants.some((v) => v.sizeId === sid && (!optionId || v.optionId === optionId) && v.stock > 0);

  const pickOption = (id: string) => {
    setOptionId(id);
    const o = p.options.find((x) => x.id === id);
    if (o?.imageId) setImgId(o.imageId);
  };
  const pickImage = (id: string) => {
    setImgId(id);
    // clicking a photo that belongs to an option selects that option too
    const o = p.options.find((x) => x.imageId === id);
    if (o && optionAvailable(o.id)) setOptionId(o.id);
  };

  const current = p.images.find((i) => i.id === imgId) ?? p.images[0];
  const shownPrice = variant?.price ?? p.minPrice;
  const compare = variant?.compareAt;
  const stock = variant?.stock ?? 0;
  const ready = !!variant;
  const canBuy = ready && stock > 0;
  const kindLabel = t(KIND_KEY[p.optionKind] || "product.scent");

  const sizeLabel = p.sizes.find((s) => s.id === sizeId)?.label ?? "";
  const optLabel = p.options.find((o) => o.id === optionId)?.label ?? "";
  const variantLabel = [sizeLabel, optLabel].filter(Boolean).join(" · ");

  const onAdd = () => {
    if (!variant || !canBuy) return;
    add(
      {
        variantId: variant.id,
        slug: p.slug,
        name: p.name,
        nameAr: locale === "ar" ? p.name : arName,
        variantLabel,
        variantLabelAr: variantLabel,
        image: current?.url ?? "/brand/placeholder.svg",
        price: variant.price,
        max: variant.stock,
      },
      qty,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  const waText = encodeURIComponent(`${p.name}${variantLabel ? " (" + variantLabel + ")" : ""} × ${qty}`);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
      {/* gallery */}
      <div className="mx-auto w-full min-w-0 max-w-xl space-y-3 lg:max-w-none">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-white shadow-card">
          {/* CSS fade (re-runs when the key changes) so the server-rendered image is never invisible */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current?.id ?? "none"}
            src={current?.url ?? "/brand/placeholder.svg"}
            alt={current?.alt || p.name}
            fetchPriority="high"
            className="animate-fade-swap absolute inset-0 h-full w-full object-contain p-6"
          />
          <div className="absolute start-4 top-4 flex flex-col gap-1.5">
            {p.offer ? <Badge tone="danger">{p.offer.badge}</Badge> : p.onSale && <Badge tone="danger">{t("common.sale")}</Badge>}
            {p.isNew && <Badge tone="accent">{t("common.new")}</Badge>}
          </div>
        </div>
        {p.images.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {p.images.map((im) => (
              <button
                key={im.id}
                onClick={() => pickImage(im.id)}
                aria-label={im.alt || p.name}
                className={cn("h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition", im.id === current?.id ? "border-brand shadow-card" : "border-border opacity-70 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* info */}
      <div className="min-w-0 space-y-6">
        <div>
          {p.categories[0] && <span className="text-xs font-bold uppercase tracking-wider text-accent">{p.categories.map((c) => c.name).join(" · ")}</span>}
          <h1 className="mt-1 text-3xl font-black leading-tight md:text-4xl">{p.name}</h1>
          {p.short && <p className="mt-3 text-base leading-relaxed text-muted">{p.short}</p>}
        </div>

        <div className="flex items-baseline gap-3">
          <AnimatePresence mode="popLayout">
            <motion.span key={shownPrice} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="text-4xl font-black text-brand">
              {!ready && p.minPrice !== p.maxPrice && <span className="me-1.5 text-sm font-semibold text-muted">{t("common.from")}</span>}
              {money(shownPrice)}
            </motion.span>
          </AnimatePresence>
          {compare && compare > shownPrice && <span className="text-lg text-muted line-through">{money(compare)}</span>}
        </div>

        {p.offer && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm">
            <span className="rounded-lg bg-danger px-2 py-0.5 font-black text-white">{p.offer.badge}</span>
            <span className="font-bold">{p.offer.name}</span>
            <span className="text-muted">· {p.offer.endsAt ? t("offers.endsOn", { date: new Date(p.offer.endsAt).toLocaleDateString(locale === "ar" ? "ar-LB-u-nu-latn" : "en-GB", { day: "numeric", month: "short" }) }) : t("offers.noEnd")}</span>
          </div>
        )}

        {needSize && (
          <div>
            <div className="mb-2.5 flex items-center justify-between text-sm font-bold">
              <span>{t("product.size")}</span>
              {!sizeId && <span className="text-xs font-medium text-muted">{t("product.chooseSize")}</span>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {p.sizes.map((s) => {
                const active = s.id === sizeId;
                const ok = sizeAvailable(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSizeId(s.id);
                      // drop a previously chosen option that does not exist in this size
                      if (optionId && !p.variants.some((v) => v.sizeId === s.id && v.optionId === optionId)) setOptionId(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "relative min-w-16 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition",
                      active ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface hover:border-brand/50",
                      !ok && "opacity-45 line-through",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {needOption && (
          <div>
            <div className="mb-2.5 flex items-center justify-between text-sm font-bold">
              <span>
                {kindLabel}
                {optLabel && <span className="ms-2 font-semibold text-accent">{optLabel}</span>}
              </span>
              {!optionId && <span className="text-xs font-medium text-muted">{t("product.chooseOption")}</span>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {p.options.map((o) => {
                const active = o.id === optionId;
                const ok = optionAvailable(o.id);
                const oImg = p.images.find((i) => i.id === o.imageId);
                return (
                  <button
                    key={o.id}
                    onClick={() => pickOption(o.id)}
                    aria-pressed={active}
                    disabled={!ok && !active && false}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border-2 py-1.5 pe-3.5 ps-1.5 text-sm font-semibold transition",
                      active ? "border-brand bg-brand-soft text-brand shadow-card" : "border-border bg-surface hover:border-brand/50",
                      !ok && "opacity-45",
                    )}
                  >
                    {o.swatch ? (
                      <span className="h-7 w-7 rounded-lg border border-border" style={{ background: o.swatch }} />
                    ) : oImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={oImg.url} alt="" className="h-9 w-9 rounded-lg bg-white object-contain" />
                    ) : (
                      <span className="w-1" />
                    )}
                    {o.label}
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="inline-flex h-12 items-center rounded-xl border border-border bg-surface">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-12 w-11 items-center justify-center hover:bg-surface-2" aria-label="-">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-bold">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(canBuy ? stock : 99, q + 1))} className="flex h-12 w-11 items-center justify-center hover:bg-surface-2" aria-label="+">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button size="lg" variant="accent" onClick={onAdd} disabled={!canBuy} className="min-w-52 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              {justAdded ? (
                <motion.span key="ok" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="inline-flex items-center gap-2">
                  <Check className="h-5 w-5" /> {t("common.added")}
                </motion.span>
              ) : (
                <motion.span key="add" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="inline-flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {!ready ? (needSize && !sizeId ? t("product.chooseSize") : t("product.chooseOption")) : canBuy ? t("common.addToCart") : t("common.outOfStock")}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>

        {ready && canBuy && stock <= 5 && <p className="text-sm font-semibold text-warn">{t("common.lowStock", { n: stock })}</p>}

        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#128c4a] hover:underline">
            {t("product.orderWhatsapp")}
          </a>
        )}

        {p.desc && (
          <div className="border-t border-border pt-6">
            <h2 className="mb-2 text-lg font-bold">{t("product.description")}</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted">{p.desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
