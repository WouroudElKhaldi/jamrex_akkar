import Link from "next/link";
import { getCategories, listProducts } from "@/lib/catalog";
import { getT } from "@/i18n";
import type { Locale } from "@/lib/utils";
import { ProductGrid } from "./product-card";
import { DesktopSort, ShopFilters } from "./shop-filters";

export type ListingParams = { q?: string; sort?: string; min?: string; max?: string; page?: string };

export async function Listing({ locale, title, subtitle, category, params }: { locale: Locale; title: string; subtitle?: string; category?: string; params: ListingParams }) {
  const t = getT(locale);
  const sort = (["new", "price-asc", "price-desc"].includes(params.sort ?? "") ? params.sort : "popular") as "popular" | "new" | "price-asc" | "price-desc";
  const page = Math.max(1, Number(params.page) || 1);
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

  const [cats, res] = await Promise.all([
    getCategories(locale),
    listProducts({ locale, category, q: params.q, sort, min: num(params.min), max: num(params.max), page, take: 24 }),
  ]);

  const qs = (p: number) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") n.set(k, v);
    if (p > 1) n.set("page", String(p));
    const s = n.toString();
    return s ? "?" + s : "";
  };
  const base = category ? `/${locale}/category/${category}` : `/${locale}/shop`;

  return (
    <div className="mx-auto max-w-[90rem] px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{params.q ? t("shop.searchFor", { q: params.q }) : title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
        <div className="mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ShopFilters categories={cats.filter((c) => c.slug !== "other")} activeCategory={category} />
        <div>
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-muted">{t("shop.results", { n: res.total })}</span>
            <DesktopSort />
          </div>

          {res.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted">{t("shop.noResults")}</div>
          ) : (
            <ProductGrid products={res.items} />
          )}

          {res.pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="pagination">
              {page > 1 && <Link href={base + qs(page - 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2">{t("shop.prev")}</Link>}
              <span className="px-3 text-sm text-muted">{page} / {res.pages}</span>
              {page < res.pages && <Link href={base + qs(page + 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2">{t("shop.next")}</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
