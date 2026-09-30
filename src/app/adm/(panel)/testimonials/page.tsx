import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { pick } from "@/lib/utils";
import { deleteTestimonial, saveTestimonial } from "@/actions/admin/content";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, Thumb, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, Input, Switch, Textarea } from "@/components/ui";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  await requireStaff("banners.manage");
  const { t, locale } = await adminT();
  const items = await db.testimonial.findMany({ orderBy: { sortOrder: "asc" } });

  const fields = (x?: (typeof items)[number]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {x && <input type="hidden" name="id" value={x.id} />}
      <Field label={`${t("a.name")} (EN)`}><Input name="nameEn" defaultValue={x?.nameEn} required /></Field>
      <Field label={`${t("a.name")} (AR)`}><Input name="nameAr" defaultValue={x?.nameAr} dir="rtl" /></Field>
      <Field label={`${t("a.text")} (EN)`}><Textarea name="textEn" defaultValue={x?.textEn} rows={3} required /></Field>
      <Field label={`${t("a.text")} (AR)`}><Textarea name="textAr" defaultValue={x?.textAr} rows={3} dir="rtl" /></Field>
      <Field label={t("a.rating")}><Input name="rating" type="number" min={1} max={5} defaultValue={x?.rating ?? 5} /></Field>
      <Field label={t("a.sort")}><Input name="sortOrder" type="number" defaultValue={x?.sortOrder ?? 0} /></Field>
      <Switch name="visible" defaultChecked={x ? x.visible : true} label={t("a.visible")} />
    </div>
  );

  const stars = (n: number) => (
    <span className="inline-flex gap-0.5" dir="ltr" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={i <= n ? "h-4 w-4 fill-warn text-warn" : "h-4 w-4 text-border"} />)}
    </span>
  );

  const rows: Row[] = items.map((x) => ({
    id: x.id,
    title: pick(locale, x.nameEn, x.nameAr),
    search: `${x.nameEn} ${x.nameAr} ${x.textEn} ${x.textAr}`,
    sort: { name: x.nameEn, rating: x.rating, order: x.sortOrder, visible: x.visible ? 1 : 0 },
    cells: {
      name: <div className="flex items-center gap-3"><Thumb letter={x.nameEn} className="rounded-full" /><p>{pick(locale, x.nameEn, x.nameAr)}</p></div>,
      text: <p className="line-clamp-2 max-w-md text-muted" dir="auto">{pick(locale, x.textEn, x.textAr)}</p>,
      rating: stars(x.rating),
      visible: <StatusDot on={x.visible} onLabel={t("a.visible")} offLabel={t("a.hidden")} />,
    },
    editor: <SaveForm action={saveTestimonial}>{fields(x)}</SaveForm>,
    actions: <form action={deleteTestimonial}><input type="hidden" name="id" value={x.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>,
  }));

  const avg = items.length ? items.reduce((n, x) => n + x.rating, 0) / items.length : 0;
  return (
    <>
      <PageHeader title={t("a.testimonials")} icon={Star} />
      <MiniStats stats={[
        { label: t("a.testimonials"), value: items.length },
        { label: t("a.visible"), value: items.filter((x) => x.visible).length, tone: "ok" },
        { label: t("a.rating"), value: Math.round(avg * 10) / 10, tone: "warn" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "testimonial")}
        reorder="testimonial"
        rows={rows}
        columns={[
          { key: "name", label: t("a.name"), sortable: true },
          { key: "text", label: t("a.text"), hideOnMobile: true },
          { key: "rating", label: t("a.rating"), sortable: true },
          { key: "visible", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.newTestimonial")}
        createEditor={<SaveForm action={saveTestimonial} submitLabel={t("a.create")} resetOnSave>{fields()}</SaveForm>}
      />
    </>
  );
}
