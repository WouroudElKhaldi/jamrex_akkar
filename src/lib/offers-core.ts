// Pure offer maths shared by the storefront, checkout and the dashboard preview (no database access here).

export type OfferLite = {
  id: string;
  nameEn: string;
  nameAr: string;
  kind: "PERCENT" | "AMOUNT";
  value: number;
  scope: "ALL" | "CATEGORIES" | "PRODUCTS";
  productIds: string[];
  categoryIds: string[];
  endsAt: string | null; // ISO
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// membership sets are built once per offer object (the offer list itself is cached), so each check is O(1) / O(categories)
const sets = new WeakMap<OfferLite, { products: Set<string>; categories: Set<string> }>();
function setsOf(o: OfferLite) {
  let s = sets.get(o);
  if (!s) sets.set(o, (s = { products: new Set(o.productIds), categories: new Set(o.categoryIds) }));
  return s;
}

export function offerApplies(o: OfferLite, productId: string, categoryIds: string[]): boolean {
  if (o.scope === "ALL") return true;
  const s = setsOf(o);
  if (o.scope === "PRODUCTS") return s.products.has(productId);
  return categoryIds.some((c) => s.categories.has(c));
}

export function discountedPrice(base: number, kind: "PERCENT" | "AMOUNT", value: number): number {
  const p = kind === "PERCENT" ? base * (1 - Math.min(100, value) / 100) : base - value;
  return round2(Math.max(0, p));
}

/** The offer that gives the lowest price for this product (null when none applies or none lowers the price). */
export function bestOffer(base: number, productId: string, categoryIds: string[], offers: OfferLite[]): { offer: OfferLite; price: number } | null {
  let best: { offer: OfferLite; price: number } | null = null;
  for (const o of offers) {
    if (!offerApplies(o, productId, categoryIds)) continue;
    const price = discountedPrice(base, o.kind, o.value);
    if (price < base && (!best || price < best.price)) best = { offer: o, price };
  }
  return best;
}

export function offerBadge(o: Pick<OfferLite, "kind" | "value">): string {
  const v = Number.isInteger(o.value) ? String(o.value) : o.value.toFixed(2);
  return o.kind === "PERCENT" ? `-${v}%` : `-$${v}`;
}
