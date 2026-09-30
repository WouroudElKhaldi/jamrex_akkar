"use client";

import Link from "next/link";
import { useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Badge } from "@/components/ui";
import { money } from "@/lib/utils";

export type MyOrder = { code: string; href: string; date: string; status: string; total: number; items: number };

/** The signed-in customer's orders (newest first) with a box to find one by its number. */
export function MyOrders({ orders }: { orders: MyOrder[] }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase().replace(/^jm-?/, "").replace(/^0+/, "");
  const shown = needle ? orders.filter((o) => o.code.toLowerCase().replace(/^jm-?/, "").replace(/^0+/, "").includes(needle)) : orders;

  return (
    <div className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">{t("account.myOrders")}</h2>
        {orders.length > 4 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("order.filterCode")} dir="ltr" className="h-10 w-full rounded-xl border border-border bg-surface ps-9 pe-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25" />
          </div>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center text-muted">{t("order.noOrdersYet")}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <Link key={o.code} href={o.href} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-glow">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><PackageSearch className="h-5 w-5" /></span>
                <div>
                  <p className="font-bold" dir="ltr">{o.code}</p>
                  <p className="text-xs text-muted">{o.date} · {o.items} {locale === "ar" ? "منتج" : o.items === 1 ? "item" : "items"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={o.status === "CANCELLED" ? "danger" : o.status === "DELIVERED" ? "ok" : "brand"}>{t(`order.status${o.status}`)}</Badge>
                <span className="font-black">{money(o.total)}</span>
              </div>
            </Link>
          ))}
          {shown.length === 0 && <p className="py-6 text-center text-muted">{t("order.notFound")}</p>}
        </div>
      )}
    </div>
  );
}
