"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { ImageField } from "./image-field";
import { cn } from "@/lib/utils";

export type OfferInit = {
  id?: string;
  nameEn: string; nameAr: string; descEn: string; descAr: string;
  kind: "PERCENT" | "AMOUNT"; value: number; scope: "ALL" | "CATEGORIES" | "PRODUCTS";
  active: boolean; showOnHome: boolean; startsAt: string; endsAt: string; image: string; sortOrder: number;
  productIds: string[]; categoryIds: string[];
};

/** The fields of one offer. Rendered inside <SaveForm> (plain form → server action `saveOffer`). */
export function OfferFields({ o, products, categories }: { o: OfferInit; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const [scope, setScope] = useState(o.scope);
  const [kind, setKind] = useState(o.kind);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(new Set(o.productIds));
  const needle = q.trim().toLowerCase();
  const shown = new Set(products.filter((p) => p.name.toLowerCase().includes(needle)).map((p) => p.id));

  return (
    <div className="space-y-5">
      {o.id && <input type="hidden" name="id" value={o.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("a.nameEn")}><Input name="nameEn" defaultValue={o.nameEn} required placeholder="Weekend deal" /></Field>
        <Field label={t("a.nameAr")}><Input name="nameAr" defaultValue={o.nameAr} dir="rtl" /></Field>
        <Field label={t("a.descEn")}><Textarea name="descEn" defaultValue={o.descEn} rows={2} /></Field>
        <Field label={t("a.descAr")}><Textarea name="descAr" defaultValue={o.descAr} rows={2} dir="rtl" /></Field>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label={t("a.offerKind")}>
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="PERCENT">{t("a.offerPercent")}</option>
            <option value="AMOUNT">{t("a.offerAmount")}</option>
          </Select>
        </Field>
        <Field label={kind === "PERCENT" ? t("a.offerValuePercent") : t("a.offerValueAmount")}>
          <Input name="value" type="number" step="0.01" min={0.01} max={kind === "PERCENT" ? 100 : undefined} defaultValue={o.value || ""} required />
        </Field>
        <Field label={t("a.offerStarts")} hint={t("a.offerDatesHint")}><Input name="startsAt" type="datetime-local" defaultValue={o.startsAt} /></Field>
        <Field label={t("a.offerEnds")}><Input name="endsAt" type="datetime-local" defaultValue={o.endsAt} /></Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("a.offerAppliesTo")}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["PRODUCTS", "CATEGORIES", "ALL"] as const).map((sc) => (
            <label key={sc} className={cn("cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-semibold transition", scope === sc ? "border-brand bg-brand-soft text-brand" : "border-border hover:border-brand/40")}>
              <input type="radio" name="scope" value={sc} checked={scope === sc} onChange={() => setScope(sc)} className="sr-only" />
              {t(`a.scope${sc}`)}
            </label>
          ))}
        </div>

        {scope === "PRODUCTS" && (
          <div className="rounded-xl border border-border">
            <div className="relative border-b border-border p-2">
              <Search className="pointer-events-none absolute start-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("a.search")} className="h-10 ps-9" />
            </div>
            <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className={shown.has(p.id) ? "" : "hidden"}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-surface-2">
                    <input
                      type="checkbox"
                      name="productIds"
                      value={p.id}
                      checked={picked.has(p.id)}
                      onChange={() => setPicked((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                      className="h-4 w-4 accent-[var(--brand)]"
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-3 py-2 text-xs text-muted">{t("a.offerSelected", { n: picked.size })}</p>
          </div>
        )}

        {scope === "CATEGORIES" && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={o.categoryIds.includes(c.id)} className="peer sr-only" />
                <span className="inline-block rounded-full border-2 border-border px-3.5 py-1.5 text-sm font-semibold transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">{c.name}</span>
              </label>
            ))}
          </div>
        )}
        {scope === "ALL" && <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">{t("a.scopeALLHelp")}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ImageField name="image" defaultValue={o.image} label={t("a.offerImage")} />
        <div className="space-y-3">
          <Switch name="active" defaultChecked={o.active} label={t("a.active")} />
          <Switch name="showOnHome" defaultChecked={o.showOnHome} label={t("a.offerShowHome")} />
          <Field label={t("a.sort")}><Input name="sortOrder" type="number" defaultValue={o.sortOrder} className="w-28" /></Field>
        </div>
      </div>
    </div>
  );
}
