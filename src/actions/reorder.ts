"use server";

import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { bestOffer, loadActiveOffers } from "@/lib/offers";
import { imageUrl, num, parseOrderCode } from "@/lib/utils";

export type ReorderLine = {
  variantId: string; slug: string; name: string; nameAr: string; variantLabel: string; variantLabelAr: string;
  image: string; price: number; max: number; qty: number;
};

/**
 * Turns a past order into cart lines using TODAY's prices and stock.
 * Same access rule as the order page: the secret link key, or the signed-in owner of the order.
 */
export async function getReorderLines(code: string, k?: string): Promise<{ lines: ReorderLine[]; skipped: number }> {
  const n = parseOrderCode(String(code).slice(0, 20));
  if (!n) return { lines: [], skipped: 0 };
  const order = await db.order.findUnique({ where: { number: n }, include: { items: true } });
  if (!order) return { lines: [], skipped: 0 };
  const customer = await getCustomer();
  const owner = customer && order.customerId === customer.id && (!!customer.emailVerifiedAt || order.createdAt >= (customer.accountCreatedAt ?? new Date(0)));
  if (!(k && k === order.accessKey) && !owner) return { lines: [], skipped: 0 };

  const ids = order.items.map((i) => i.variantId).filter((x): x is string => !!x);
  const variants = await db.variant.findMany({
    where: { id: { in: ids }, active: true, stock: { gt: 0 }, product: { active: true } },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, categories: true } }, size: true, option: true },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const offers = await loadActiveOffers();
  const lines: ReorderLine[] = [];
  for (const it of order.items) {
    const v = it.variantId ? byId.get(it.variantId) : undefined;
    if (!v) continue;
    const base = num(v.price);
    const deal = bestOffer(base, v.productId, v.product.categories.map((c) => c.categoryId), offers);
    const img = (v.option?.imageId ? v.product.images.find((i) => i.id === v.option!.imageId) : undefined) ?? v.product.images[0];
    lines.push({
      variantId: v.id,
      slug: v.product.slug,
      name: v.product.nameEn,
      nameAr: v.product.nameAr,
      variantLabel: [v.size?.labelEn, v.option?.labelEn].filter(Boolean).join(" · "),
      variantLabelAr: [v.size?.labelAr || v.size?.labelEn, v.option?.labelAr || v.option?.labelEn].filter(Boolean).join(" · "),
      image: imageUrl(img?.path, "sm"),
      price: deal ? deal.price : base,
      max: v.stock,
      qty: Math.min(it.qty, v.stock),
    });
  }
  return { lines, skipped: order.items.length - lines.length };
}
