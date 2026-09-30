import { Image as ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { imageUrl, pick } from "@/lib/utils";
import { deleteBanner, saveBanner } from "@/actions/admin/content";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, Thumb, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, Input, Switch } from "@/components/ui";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  await requireStaff("banners.manage");
  const { t, locale } = await adminT();
  const banners = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });

  const fields = (b?: (typeof banners)[number]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label={`${t("a.title")} (EN)`}><Input name="titleEn" defaultValue={b?.titleEn} required /></Field>
      <Field label={`${t("a.title")} (AR)`}><Input name="titleAr" defaultValue={b?.titleAr} dir="rtl" /></Field>
      <Field label={`${t("a.subtitle")} (EN)`}><Input name="subtitleEn" defaultValue={b?.subtitleEn} /></Field>
      <Field label={`${t("a.subtitle")} (AR)`}><Input name="subtitleAr" defaultValue={b?.subtitleAr} dir="rtl" /></Field>
      <Field label={`${t("a.cta")} (EN)`}><Input name="ctaEn" defaultValue={b?.ctaEn} /></Field>
      <Field label={`${t("a.cta")} (AR)`}><Input name="ctaAr" defaultValue={b?.ctaAr} dir="rtl" /></Field>
      <Field label={t("a.link")} hint="/category/offers"><Input name="link" defaultValue={b?.link} dir="ltr" /></Field>
      <Field label={t("a.sort")}><Input name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} /></Field>
      <ImageField name="image" defaultValue={b?.image ?? ""} label={t("a.image")} />
      <div className="flex items-end"><Switch name="active" defaultChecked={b ? b.active : true} label={t("a.active")} /></div>
    </div>
  );

  const rows: Row[] = banners.map((b) => ({
    id: b.id,
    title: pick(locale, b.titleEn, b.titleAr),
    subtitle: b.link ?? undefined,
    search: `${b.titleEn} ${b.titleAr} ${b.subtitleEn ?? ""} ${b.link ?? ""}`,
    sort: { title: b.titleEn, order: b.sortOrder, active: b.active ? 1 : 0 },
    cells: {
      title: <div className="flex items-center gap-3"><Thumb src={b.image ? imageUrl(b.image) : undefined} letter={b.titleEn} className="h-11 w-16" /><div className="min-w-0"><p className="truncate">{pick(locale, b.titleEn, b.titleAr)}</p><p className="truncate text-xs font-normal text-muted" dir="auto">{pick(locale, b.subtitleEn ?? "", b.subtitleAr ?? "")}</p></div></div>,
      link: b.link ? <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs" dir="ltr">{b.link}</span> : <span className="text-muted">—</span>,
      order: <span className="text-muted">{b.sortOrder}</span>,
      active: <StatusDot on={b.active} onLabel={t("a.active")} offLabel={t("a.inactive")} />,
    },
    editor: <SaveForm action={saveBanner}>{fields(b)}</SaveForm>,
    actions: <form action={deleteBanner}><input type="hidden" name="id" value={b.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>,
  }));

  return (
    <>
      <PageHeader title={t("a.banners")} icon={ImageIcon} />
      <MiniStats stats={[
        { label: t("a.banners"), value: banners.length },
        { label: t("a.active"), value: banners.filter((b) => b.active).length, tone: "ok" },
        { label: t("a.inactive"), value: banners.filter((b) => !b.active).length, tone: "warn" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "banner")}
        reorder="banner"
        rows={rows}
        columns={[
          { key: "title", label: t("a.title"), sortable: true },
          { key: "link", label: t("a.link"), hideOnMobile: true },
          { key: "order", label: t("a.sort"), sortable: true, hideOnMobile: true },
          { key: "active", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.newBanner")}
        createEditor={<SaveForm action={saveBanner} submitLabel={t("a.create")} resetOnSave>{fields()}</SaveForm>}
      />
    </>
  );
}
