import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { memo } from "@/lib/memo";
import { imageUrl, num, pick, type Locale } from "@/lib/utils";
import { bestOffer, loadActiveOffers, offerBadge, type OfferLite } from "@/lib/offers";

/* ───────────────────────── database shape ───────────────────────── */

const productInclude = {
  categories: { include: { category: true } },
  sizes: { orderBy: { sortOrder: "asc" } },
  options: { orderBy: { sortOrder: "asc" } },
  images: { orderBy: { sortOrder: "asc" } },
  variants: { where: { active: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/* ───────────────────────── what the pages receive ───────────────────────── */

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  short: string;
  desc: string;
  featured: boolean;
  isNew: boolean;
  optionKind: string;
  categories: { slug: string; name: string }[];
  images: { id: string; url: string; thumb: string; alt: string }[];
  sizes: { id: string; label: string }[];
  options: { id: string; label: string; swatch: string | null; imageId: string | null }[];
  variants: { id: string; sizeId: string | null; optionId: string | null; price: number; compareAt: number | null; stock: number }[];
  minPrice: number;
  maxPrice: number;
  onSale: boolean;
  inStock: boolean;
  /** when the whole product is nearly gone: the highest stock left among its variants (≤ 5), otherwise 0 */
  lowStock: number;
  /** the active offer that gives this product its best discount (if any) */
  offer: { id: string; name: string; badge: string; endsAt: string | null } | null;
};

export function toView(p: ProductRow, locale: Locale, offers: OfferLite[] = []): ProductView {
  const catIds = p.categories.map((c) => c.categoryId);
  let topOffer: { offer: OfferLite; saving: number } | null = null;
  const variants = p.variants.map((v) => {
    const base = num(v.price);
    const own = v.compareAtPrice ? num(v.compareAtPrice) : null;
    const b = bestOffer(base, p.id, catIds, offers);
    if (b && (!topOffer || base - b.price > topOffer.saving)) topOffer = { offer: b.offer, saving: base - b.price };
    return {
      id: v.id,
      sizeId: v.sizeId,
      optionId: v.optionId,
      price: b ? b.price : base,
      // the crossed-out price is the normal price (or the manual "old price" if that is higher)
      compareAt: b ? (own && own > base ? own : base) : own,
      stock: v.stock,
    };
  });
  const top = topOffer as { offer: OfferLite; saving: number } | null;

  // one pass over the variants: prices, stock and sale flag together
  let min = Infinity, max = 0, minInStock = Infinity, onSale = false, inStockCount = 0, maxStock = 0;
  for (const v of variants) {
    if (v.price < min) min = v.price;
    if (v.price > max) max = v.price;
    if (v.compareAt && v.compareAt > v.price) onSale = true;
    if (v.stock > 0) {
      inStockCount++;
      if (v.price < minInStock) minInStock = v.price;
      if (v.stock > maxStock) maxStock = v.stock;
    }
  }
  const from = inStockCount ? minInStock : min; // "from" price ignores sold-out variants
  return {
    id: p.id,
    slug: p.slug,
    name: pick(locale, p.nameEn, p.nameAr),
    short: pick(locale, p.shortEn, p.shortAr),
    desc: pick(locale, p.descEn, p.descAr),
    featured: p.featured,
    isNew: p.isNew,
    optionKind: p.optionKind,
    categories: p.categories.map((c) => ({ slug: c.category.slug, name: pick(locale, c.category.nameEn, c.category.nameAr) })),
    images: p.images.map((i) => ({ id: i.id, url: imageUrl(i.path), thumb: imageUrl(i.path, "sm"), alt: i.alt })),
    sizes: p.sizes.map((s) => ({ id: s.id, label: pick(locale, s.labelEn, s.labelAr) })),
    options: p.options.map((o) => ({ id: o.id, label: pick(locale, o.labelEn, o.labelAr), swatch: o.swatch, imageId: o.imageId })),
    variants,
    minPrice: Number.isFinite(from) ? from : 0,
    maxPrice: variants.length ? max : 0,
    onSale,
    inStock: inStockCount > 0,
    lowStock: inStockCount > 0 && maxStock <= 5 ? maxStock : 0,
    offer: top ? { id: top.offer.id, name: pick(locale, top.offer.nameEn, top.offer.nameAr), badge: offerBadge(top.offer), endsAt: top.offer.endsAt } : null,
  };
}

/** A product card needs no long text, no full gallery and no option details: sending them made the home page 430 KB. */
function toCard(p: ProductView): ProductView {
  return {
    ...p,
    desc: "",
    short: "",
    categories: p.categories.slice(0, 1),
    images: p.images.slice(0, 2).map((i) => ({ id: i.id, url: i.thumb, thumb: i.thumb, alt: i.alt })),
    options: p.options.map((o) => ({ id: o.id, label: "", swatch: null, imageId: null })),
    variants: p.variants.length === 1 ? p.variants : [], // a card can only "add to cart" a product that has exactly one variant
  };
}

/* ───────────────────────── the in-memory catalogue index ─────────────────────────
 * Built once per language (and again after any staff change or a minute), then every list on every page is a
 * cheap filter over precomputed arrays instead of a database query plus a rebuild of every product.
 */

type Entry = {
  card: ProductView;
  full: ProductView;
  catSlugs: Set<string>;
  /** lower-cased text the search box matches (both languages) */
  hay: string;
};
type Index = { entries: Entry[]; bySlug: Map<string, Entry>; byCategory: Map<string, Entry[]> };

const activeRows = () =>
  memo("products", 60_000, () =>
    db.product.findMany({ where: { active: true, variants: { some: { active: true } } }, include: productInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  );

const catalogIndex = (locale: Locale): Promise<Index> =>
  memo(`catalog:${locale}`, 60_000, async () => {
    const [rows, offers] = await Promise.all([activeRows(), loadActiveOffers()]);
    const built = rows.map((r): Entry => {
      const full = toView(r, locale, offers);
      return { card: toCard(full), full, catSlugs: new Set(full.categories.map((c) => c.slug)), hay: `${r.nameEn} ${r.nameAr} ${r.shortEn} ${r.shortAr}`.toLowerCase() };
    });
    // staff order first, sold-out products at the end (Array.sort is stable, so the staff order is kept inside each group)
    const entries = built.sort((a, b) => Number(b.full.inStock) - Number(a.full.inStock));
    const bySlug = new Map<string, Entry>();
    const byCategory = new Map<string, Entry[]>();
    for (const e of entries) {
      bySlug.set(e.full.slug, e);
      for (const slug of e.catSlugs) {
        const list = byCategory.get(slug);
        if (list) list.push(e);
        else byCategory.set(slug, [e]);
      }
    }
    return { entries, bySlug, byCategory };
  });

/* ───────────────────────── queries ───────────────────────── */

export type ListOpts = {
  locale: Locale;
  category?: string;
  q?: string;
  sort?: "popular" | "new" | "price-asc" | "price-desc";
  min?: number;
  max?: number;
  featured?: boolean;
  isNew?: boolean;
  take?: number;
  page?: number;
  excludeId?: string;
  /** only discounted products, bundles from the "offers" category, or products of one offer */
  onlyDeals?: boolean;
  offerId?: string;
};

export async function listProducts(o: ListOpts): Promise<{ items: ProductView[]; total: number; pages: number }> {
  const idx = await catalogIndex(o.locale);
  const needle = o.q?.trim().toLowerCase();

  // one pass, every filter checked per entry: O(k) for the k products of the category (or all products)
  const source = o.category ? idx.byCategory.get(o.category) ?? [] : idx.entries;
  let list = source.filter((e) => {
    const p = e.full;
    if (o.featured && !p.featured) return false;
    if (o.isNew && !p.isNew) return false;
    if (o.excludeId && p.id === o.excludeId) return false;
    if (needle && !e.hay.includes(needle)) return false;
    if (o.min !== undefined && p.minPrice < o.min) return false;
    if (o.max !== undefined && p.minPrice > o.max) return false;
    if (o.offerId && p.offer?.id !== o.offerId) return false;
    if (o.onlyDeals && !p.onSale && !e.catSlugs.has("offers")) return false;
    return true;
  });

  // the source is already "staff order, sold-out last": only price / newest need one more stable sort (sold-out stays last)
  if (o.sort === "price-asc" || o.sort === "price-desc" || o.sort === "new") {
    const dir = o.sort === "price-desc" ? -1 : 1;
    list = list.slice().sort((a, b) => {
      const stock = Number(b.full.inStock) - Number(a.full.inStock);
      if (stock) return stock;
      return o.sort === "new" ? Number(b.full.isNew) - Number(a.full.isNew) : (a.full.minPrice - b.full.minPrice) * dir;
    });
  }

  const total = list.length;
  const take = o.take ?? 24;
  const page = Math.max(1, o.page ?? 1);
  return { items: list.slice((page - 1) * take, page * take).map((e) => e.card), total, pages: Math.max(1, Math.ceil(total / take)) };
}

/** One product with everything (gallery, all options, description). O(1) from the index. */
export async function getProduct(slug: string, locale: Locale): Promise<ProductView | null> {
  const hit = (await catalogIndex(locale)).bySlug.get(slug);
  if (hit) return hit.full;
  // a product with no sellable variant is not in the index but its page must still open
  const [p, offers] = await Promise.all([db.product.findFirst({ where: { slug, active: true }, include: productInclude }), loadActiveOffers()]);
  return p ? toView(p, locale, offers) : null;
}

export async function getCategories(locale: Locale, all = false) {
  const cats = await memo(`categories:${all}`, 60_000, () =>
    db.category.findMany({
      where: all ? {} : { visible: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { product: { active: true } } } } } },
    }),
  );
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: pick(locale, c.nameEn, c.nameAr),
    desc: pick(locale, c.descEn, c.descAr),
    image: c.image ? imageUrl(c.image, "sm") : null,
    count: c._count.products,
  }));
}
