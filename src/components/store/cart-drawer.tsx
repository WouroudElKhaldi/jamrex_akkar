"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui";
import { money } from "@/lib/utils";

export function CartButton() {
  const { count, setOpen } = useCart();
  const { t } = useI18n();
  return (
    <button onClick={() => setOpen(true)} aria-label={t("common.cart")} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-surface-2">
      <ShoppingBag className="h-5 w-5" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-fg">
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function CartDrawer({ freeOver }: { freeOver?: number | null }) {
  const { lines, open, setOpen, setQty, remove, subtotal, count } = useCart();
  const { t, locale, dir } = useI18n();
  const isAr = locale === "ar";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("cart.title")}
            initial={{ x: dir === "rtl" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: dir === "rtl" ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 end-0 z-[80] flex w-full max-w-md flex-col border-s border-border bg-surface shadow-glow"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold">
                {t("cart.title")} <span className="text-sm font-medium text-muted">({t("cart.items", { n: count })})</span>
              </h2>
              <button onClick={() => setOpen(false)} aria-label={t("common.close")} className="rounded-lg p-2 hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <ShoppingBag className="h-9 w-9" />
                </div>
                <p className="text-lg font-bold">{t("cart.empty")}</p>
                <p className="text-sm text-muted">{t("cart.emptyText")}</p>
                <Button variant="soft" onClick={() => setOpen(false)}>
                  {t("cart.continue")}
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li key={l.variantId} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="flex gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.image} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/${locale}/product/${l.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-semibold hover:text-brand">
                            {isAr && l.nameAr ? l.nameAr : l.name}
                          </Link>
                          {(l.variantLabel || l.variantLabelAr) && <p className="mt-0.5 text-xs text-muted">{isAr && l.variantLabelAr ? l.variantLabelAr : l.variantLabel}</p>}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-lg border border-border">
                              <button onClick={() => setQty(l.variantId, l.qty - 1)} className="p-1.5 hover:bg-surface-2" aria-label="-">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{l.qty}</span>
                              <button onClick={() => setQty(l.variantId, l.qty + 1)} disabled={l.qty >= l.max} className="p-1.5 hover:bg-surface-2 disabled:opacity-40" aria-label="+">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="text-sm font-bold">{money(l.price * l.qty)}</span>
                          </div>
                        </div>
                        <button onClick={() => remove(l.variantId)} aria-label={t("common.remove")} className="self-start rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <div className="flex items-center justify-between text-base font-bold">
                    <span>{t("common.subtotal")}</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {!!freeOver && freeOver > 0 && (
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" initial={false} animate={{ width: `${Math.min(100, (subtotal / freeOver) * 100)}%` }} transition={{ type: "spring", damping: 24, stiffness: 160 }} />
                      </div>
                      <p className={`mt-1.5 text-xs font-semibold ${subtotal >= freeOver ? "text-ok" : "text-muted"}`}>{subtotal >= freeOver ? t("cart.freeReached") : t("cart.freeLeft", { amount: money(freeOver - subtotal) })}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted">{t("cart.deliveryNote")}</p>
                  <Link href={`/${locale}/checkout`} onClick={() => setOpen(false)}>
                    <Button variant="accent" size="lg" className="w-full">
                      {t("cart.checkout")}
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
