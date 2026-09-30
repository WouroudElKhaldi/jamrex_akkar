import { Tags } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { imageUrl, pick } from "@/lib/utils";
import { deleteCategory, saveCategory } from "@/actions/admin/content";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, Thumb, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, Input, Switch, Textarea } from "@/components/ui";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff("categories.manage");
  const { t, locale } = await adminT();
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });

  const fields = (c?: (typeof cats)[number]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label={t("a.nameEn")}><Input name="nameEn" defaultValue={c?.nameEn} required /></Field>
      <Field label={t("a.nameAr")}><Input name="nameAr" defaultValue={c?.nameAr} dir="rtl" /></Field>
      <Field label={t("a.descEn")}><Textarea name="descEn" defaultValue={c?.descEn} rows={2} /></Field>
      <Field label={t("a.descAr")}><Textarea name="descAr" defaultValue={c?.descAr} rows={2} dir="rtl" /></Field>
      <Field label={t("a.slug")}><Input name="slug" defaultValue={c?.slug} dir="ltr" placeholder="auto" /></Field>
      <Field label={t("a.sort")}><Input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} /></Field>
      <ImageField name="image" defaultValue={c?.image ?? ""} label={t("a.image")} />
      <div className="flex items-end"><Switch name="visible" defaultChecked={c ? c.visible : true} label={t("a.visible")} /></div>
    </div>
  );

  const rows: Row[] = cats.map((c) => ({
    id: c.id,
    title: pick(locale, c.nameEn, c.nameAr),
    subtitle: `/${c.slug}`,
    search: `${c.nameEn} ${c.nameAr} ${c.slug}`,
    sort: { name: c.nameEn, products: c._count.products, order: c.sortOrder, visible: c.visible ? 1 : 0 },
    cells: {
      name: <div className="flex items-center gap-3"><Thumb src={c.image ? imageUrl(c.image) : undefined} letter={c.nameEn} /><div><p>{pick(locale, c.nameEn, c.nameAr)}</p><p className="text-xs font-normal text-muted" dir="ltr">/{c.slug}</p></div></div>,
      products: <span className="font-bold">{c._count.products}</span>,
      order: <span className="text-muted">{c.sortOrder}</span>,
      visible: <StatusDot on={c.visible} onLabel={t("a.visible")} offLabel={t("a.hidden")} />,
    },
    editor: <SaveForm action={saveCategory}>{fields(c)}</SaveForm>,
    actions: <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>,
  }));

  return (
    <>
      <PageHeader title={t("a.categories")} icon={Tags} />
      <MiniStats stats={[
        { label: t("a.categories"), value: cats.length },
        { label: t("a.visible"), value: cats.filter((c) => c.visible).length, tone: "ok" },
        { label: t("a.hidden"), value: cats.filter((c) => !c.visible).length, tone: "warn" },
        { label: t("a.products"), value: cats.reduce((n, c) => n + c._count.products, 0), tone: "accent" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "category")}
        reorder="category"
        rows={rows}
        columns={[
          { key: "name", label: t("a.name"), sortable: true },
          { key: "products", label: t("a.products"), sortable: true },
          { key: "order", label: t("a.sort"), sortable: true, hideOnMobile: true },
          { key: "visible", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.newCategory")}
        createEditor={<SaveForm action={saveCategory} submitLabel={t("a.create")} resetOnSave>{fields()}</SaveForm>}
      />
    </>
  );
}
