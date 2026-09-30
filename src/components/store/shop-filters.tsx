"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

export function ShopFilters({ categories, activeCategory }: { categories: { slug: string; name: string; count: number }[]; activeCategory?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    router.push(pathname + (qs ? "?" + qs : ""));
  };

  const panel = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-bold">{t("common.categories")}</h3>
        <ul className="space-y-1">
          <li>
            <Link href={`/${locale}/shop`} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2", !activeCategory && "bg-brand-soft font-bold text-brand")}>
              {t("shop.allCategories")}
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/${locale}/category/${c.slug}`} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2", activeCategory === c.slug && "bg-brand-soft font-bold text-brand")}>
                <span>{c.name}</span>
                <span className="text-xs text-muted">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">{t("shop.price")} ($)</h3>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} inputMode="decimal" placeholder={t("shop.min")} value={min} onChange={(e) => setMin(e.target.value)} className="h-10" />
          <span className="text-muted">–</span>
          <Input type="number" min={0} inputMode="decimal" placeholder={t("shop.max")} value={max} onChange={(e) => setMax(e.target.value)} className="h-10" />
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => push({ min: min || null, max: max || null })}>{t("shop.apply")}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setMin(""); setMax(""); push({ min: null, max: null }); }}>{t("shop.clear")}</Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex items-center gap-3 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" /> {t("shop.filters")}
        </Button>
        <SortSelect push={push} value={sp.get("sort") ?? ""} />
      </div>
      {open && <div className="mb-6 rounded-2xl border border-border bg-surface p-4 lg:hidden">{panel}</div>}
      <aside className="sticky top-32 hidden self-start lg:block">{panel}</aside>
    </>
  );
}

function SortSelect({ push, value }: { push: (p: Record<string, string | null>) => void; value: string }) {
  const { t } = useI18n();
  return (
    <Select value={value} onChange={(e) => push({ sort: e.target.value || null })} aria-label={t("shop.sort")} className="h-9 w-auto min-w-44 text-xs">
      <option value="">{t("shop.sortPopular")}</option>
      <option value="new">{t("shop.sortNew")}</option>
      <option value="price-asc">{t("shop.sortPriceAsc")}</option>
      <option value="price-desc">{t("shop.sortPriceDesc")}</option>
    </Select>
  );
}

export function DesktopSort() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    next.delete("page");
    router.push(pathname + (next.toString() ? "?" + next.toString() : ""));
  };
  return <div className="hidden lg:block"><SortSelect push={push} value={sp.get("sort") ?? ""} /></div>;
}
