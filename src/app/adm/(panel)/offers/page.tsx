import { BadgePercent } from "lucide-react";
import { db } from "@/lib/db";
import Link from "next/link";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate, imageUrl, num, pick } from "@/lib/utils";
import { offerBadge } from "@/lib/offers-core";
import { deleteOffer, saveOffer, toggleOffer } from "@/actions/admin/offers";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { OfferFields, type OfferInit } from "@/components/admin/offer-form";
import { Badge } from "@/components/ui";

export const metadata = { title: "Offers" };

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time
const local = (d: Date | null) => {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default async function OffersAdminPage() {
  await requireStaff("offers.manage");
  const { t, locale } = await adminT();
  const [offers, products, cats] = await Promise.all([
    db.offer.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }], include: { products: true, categories: true } }),
    db.product.findMany({ where: { active: true }, orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, nameAr: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const prodOpts = products.map((p) => ({ id: p.id, name: pick(locale, p.nameEn, p.nameAr) }));
  const catOpts = cats.map((c) => ({ id: c.id, name: pick(locale, c.nameEn, c.nameAr) }));
  const now = new Date();

  const init = (o?: (typeof offers)[number]): OfferInit => ({
    id: o?.id,
    nameEn: o?.nameEn ?? "", nameAr: o?.nameAr ?? "", descEn: o?.descEn ?? "", descAr: o?.descAr ?? "",
    kind: o?.kind === "AMOUNT" ? "AMOUNT" : "PERCENT", value: o ? num(o.value) : 10,
    scope: (o?.scope as OfferInit["scope"]) ?? "PRODUCTS",
    active: o ? o.active : true, showOnHome: o ? o.showOnHome : true,
    startsAt: local(o?.startsAt ?? null), endsAt: local(o?.endsAt ?? null), image: o?.image ?? "", sortOrder: o?.sortOrder ?? 0,
    productIds: o?.products.map((p) => p.productId) ?? [], categoryIds: o?.categories.map((c) => c.categoryId) ?? [],
  });

  const status = (o: (typeof offers)[number]) => {
    if (!o.active) return { tone: "muted" as const, label: t("a.inactive"), rank: 0 };
    if (o.startsAt && o.startsAt > now) return { tone: "warn" as const, label: t("a.offerScheduled"), rank: 1 };
    if (o.endsAt && o.endsAt < now) return { tone: "danger" as const, label: t("a.offerExpired"), rank: 2 };
    return { tone: "ok" as const, label: t("a.offerLive"), rank: 3 };
  };

  const bundleCount = await db.productCategory.count({ where: { category: { slug: "offers" }, product: { active: true } } });
  const rows: Row[] = offers.map((o) => {
    const st = status(o);
    const badge = offerBadge({ kind: o.kind === "AMOUNT" ? "AMOUNT" : "PERCENT", value: num(o.value) });
    const name = pick(locale, o.nameEn, o.nameAr);
    return {
      id: o.id,
      title: name,
      subtitle: badge,
      search: `${o.nameEn} ${o.nameAr} ${badge}`,
      sort: { name: o.nameEn, value: num(o.value), scope: o.scope, ends: o.endsAt?.getTime() ?? 9e15, status: st.rank },
      cells: {
        name: (
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 min-w-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-danger to-[#ff8a8e] px-2 text-base font-black text-white shadow-card">
              <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer-move_3s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="relative">{badge}</span>
            </span>
            <div className="min-w-0"><p className="truncate">{name}</p>{o.image && <p className="text-xs font-normal text-muted">🖼 <span dir="ltr">{imageUrl(o.image).split("/").pop()}</span></p>}</div>
          </div>
        ),
        scope: <span className="text-muted">{t(`a.scope${o.scope}`)}{o.scope === "PRODUCTS" ? ` (${o.products.length})` : o.scope === "CATEGORIES" ? ` (${o.categories.length})` : ""}</span>,
        dates: <span className="whitespace-nowrap text-xs text-muted">{o.startsAt || o.endsAt ? `${o.startsAt ? formatDate(o.startsAt, locale) : "…"} → ${o.endsAt ? formatDate(o.endsAt, locale) : "…"}` : "—"}</span>,
        status: <Badge tone={st.tone}>{st.label}</Badge>,
      },
      editor: <SaveForm action={saveOffer}><OfferFields o={init(o)} products={prodOpts} categories={catOpts} /></SaveForm>,
      actions: (
        <>
          <form action={toggleOffer}><input type="hidden" name="id" value={o.id} /><button type="submit" className="h-9 rounded-xl border border-border px-3 text-sm font-semibold transition hover:bg-surface-2">{o.active ? t("a.offerTurnOff") : t("a.offerTurnOn")}</button></form>
          <form action={deleteOffer}><input type="hidden" name="id" value={o.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>
        </>
      ),
    };
  });

  const live = offers.filter((o) => status(o).rank === 3).length;
  return (
    <>
      <PageHeader title={t("a.offers")} subtitle={t("a.offersHelp")} icon={BadgePercent} />
      {bundleCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand-soft/60 p-4 text-sm">
          <p className="max-w-3xl">{t("a.offersInfo", { n: bundleCount })}</p>
          <Link href={`${adminBase()}/products`} className="inline-flex h-9 items-center rounded-xl bg-brand px-4 font-semibold text-brand-fg transition hover:opacity-90">{t("a.goProducts")}</Link>
        </div>
      )}
      <MiniStats stats={[
        { label: t("a.offers"), value: offers.length },
        { label: t("a.offerLive"), value: live, tone: "ok" },
        { label: t("a.offerScheduled"), value: offers.filter((o) => status(o).rank === 1).length, tone: "warn" },
        { label: t("a.offerExpired"), value: offers.filter((o) => status(o).rank === 2).length, tone: "danger" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "offer")}
        wide
        rows={rows}
        columns={[
          { key: "name", label: t("a.name"), sortable: true },
          { key: "scope", label: t("a.offerAppliesTo"), sortable: true, hideOnMobile: true },
          { key: "dates", label: t("a.date"), sortable: true, hideOnMobile: true },
          { key: "status", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.newOffer")}
        createEditor={<SaveForm action={saveOffer} submitLabel={t("a.create")}><OfferFields o={init()} products={prodOpts} categories={catOpts} /></SaveForm>}
      />
    </>
  );
}
