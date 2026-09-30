import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { memo } from "@/lib/memo";
import { num } from "@/lib/utils";
import type { OfferLite } from "@/lib/offers-core";

export * from "@/lib/offers-core";

/** Offers that are switched on and inside their start/end dates right now. */
export const loadActiveOffers = cache((): Promise<OfferLite[]> => memo("offers", 30_000, loadOffersFromDb));

async function loadOffersFromDb(): Promise<OfferLite[]> {
  const now = new Date();
  const rows = await db.offer.findMany({
    where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    include: { products: true, categories: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((o) => ({
    id: o.id,
    nameEn: o.nameEn,
    nameAr: o.nameAr,
    kind: o.kind === "AMOUNT" ? "AMOUNT" : "PERCENT",
    value: num(o.value),
    scope: (["ALL", "CATEGORIES", "PRODUCTS"].includes(o.scope) ? o.scope : "PRODUCTS") as OfferLite["scope"],
    productIds: o.products.map((p) => p.productId),
    categoryIds: o.categories.map((c) => c.categoryId),
    endsAt: o.endsAt ? o.endsAt.toISOString() : null,
  }));
}
