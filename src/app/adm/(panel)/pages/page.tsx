import { ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { pick } from "@/lib/utils";
import { deletePage, savePage } from "@/actions/admin/content";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, Input, Switch, Textarea } from "@/components/ui";

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  await requireStaff("pages.manage");
  const { t, locale } = await adminT();
  const pages = await db.page.findMany({ orderBy: { sortOrder: "asc" } });

  const fields = (p?: (typeof pages)[number]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label={`${t("a.title")} (EN)`}><Input name="titleEn" defaultValue={p?.titleEn} required /></Field>
      <Field label={`${t("a.title")} (AR)`}><Input name="titleAr" defaultValue={p?.titleAr} dir="rtl" /></Field>
      <Field label={`${t("a.body")} (EN)`} hint={t("a.bodyHelp")}><Textarea name="bodyEn" defaultValue={p?.bodyEn} rows={10} /></Field>
      <Field label={`${t("a.body")} (AR)`} hint={t("a.bodyHelp")}><Textarea name="bodyAr" defaultValue={p?.bodyAr} rows={10} dir="rtl" /></Field>
      <Field label={t("a.slug")}><Input name="slug" defaultValue={p?.slug} dir="ltr" placeholder="auto" /></Field>
      <Field label={t("a.sort")}><Input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} /></Field>
      <Switch name="published" defaultChecked={p ? p.published : true} label={t("a.published")} />
      <Switch name="inFooter" defaultChecked={p ? p.inFooter : true} label={t("a.inFooter")} />
    </div>
  );

  const rows: Row[] = pages.map((p) => ({
    id: p.id,
    title: pick(locale, p.titleEn, p.titleAr),
    subtitle: `/p/${p.slug}`,
    search: `${p.titleEn} ${p.titleAr} ${p.slug}`,
    sort: { title: p.titleEn, slug: p.slug, order: p.sortOrder, published: p.published ? 1 : 0 },
    cells: {
      title: <div><p>{pick(locale, p.titleEn, p.titleAr)}</p><p className="text-xs font-normal text-muted" dir="auto">{locale === "ar" ? p.titleEn : p.titleAr}</p></div>,
      slug: <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs" dir="ltr">/p/{p.slug}</span>,
      footer: <StatusDot on={p.inFooter} onLabel={t("a.yes")} offLabel={t("a.no")} />,
      order: <span className="text-muted">{p.sortOrder}</span>,
      published: <StatusDot on={p.published} onLabel={t("a.published")} offLabel={t("a.hidden")} />,
    },
    editor: <SaveForm action={savePage}>{fields(p)}</SaveForm>,
    actions: <form action={deletePage}><input type="hidden" name="id" value={p.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>,
  }));

  return (
    <>
      <PageHeader title={t("a.pages")} icon={ScrollText} />
      <MiniStats stats={[
        { label: t("a.pages"), value: pages.length },
        { label: t("a.published"), value: pages.filter((p) => p.published).length, tone: "ok" },
        { label: t("a.inFooter"), value: pages.filter((p) => p.inFooter).length, tone: "accent" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "page")}
        reorder="page"
        wide
        rows={rows}
        columns={[
          { key: "title", label: t("a.title"), sortable: true },
          { key: "slug", label: t("a.slug"), sortable: true, hideOnMobile: true },
          { key: "footer", label: t("a.inFooter"), hideOnMobile: true },
          { key: "order", label: t("a.sort"), sortable: true, hideOnMobile: true },
          { key: "published", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.newPage")}
        createEditor={<SaveForm action={savePage} submitLabel={t("a.create")} resetOnSave>{fields()}</SaveForm>}
      />
    </>
  );
}
