import { Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { money, num, pick } from "@/lib/utils";
import { deleteZone, saveZone } from "@/actions/admin/content";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, Input, Switch } from "@/components/ui";

export const metadata = { title: "Delivery" };

export default async function DeliveryPage() {
  await requireStaff("delivery.manage");
  const { t, locale } = await adminT();
  const zones = await db.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } });

  const fields = (z?: (typeof zones)[number]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {z && <input type="hidden" name="id" value={z.id} />}
      <Field label={t("a.zoneName") + " (EN)"}><Input name="nameEn" defaultValue={z?.nameEn} required /></Field>
      <Field label={t("a.zoneName") + " (AR)"}><Input name="nameAr" defaultValue={z?.nameAr} dir="rtl" /></Field>
      <Field label={t("a.fee")}><Input name="fee" type="number" step="0.01" min={0} defaultValue={z ? num(z.fee) : 4} required /></Field>
      <Field label={t("a.freeOver")}><Input name="freeOver" type="number" step="0.01" min={0} defaultValue={z?.freeOver ? num(z.freeOver) : ""} /></Field>
      <Field label={t("a.sort")}><Input name="sortOrder" type="number" defaultValue={z?.sortOrder ?? 0} /></Field>
      <div className="flex items-end"><Switch name="active" defaultChecked={z ? z.active : true} label={t("a.active")} /></div>
    </div>
  );

  const rows: Row[] = zones.map((z) => ({
    id: z.id,
    title: pick(locale, z.nameEn, z.nameAr),
    subtitle: money(z.fee),
    search: `${z.nameEn} ${z.nameAr}`,
    sort: { name: z.nameEn, fee: num(z.fee), free: z.freeOver ? num(z.freeOver) : 0, active: z.active ? 1 : 0 },
    cells: {
      name: <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Truck className="h-5 w-5" /></span><div><p>{pick(locale, z.nameEn, z.nameAr)}</p><p className="text-xs font-normal text-muted" dir="auto">{locale === "ar" ? z.nameEn : z.nameAr}</p></div></div>,
      fee: <span className="font-black text-brand">{money(z.fee)}</span>,
      free: z.freeOver ? <span className="font-semibold">{money(z.freeOver)}</span> : <span className="text-muted">—</span>,
      active: <StatusDot on={z.active} onLabel={t("a.active")} offLabel={t("a.inactive")} />,
    },
    editor: <SaveForm action={saveZone}>{fields(z)}</SaveForm>,
    actions: <form action={deleteZone}><input type="hidden" name="id" value={z.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>,
  }));

  const avg = zones.length ? zones.reduce((n, z) => n + num(z.fee), 0) / zones.length : 0;
  return (
    <>
      <PageHeader title={t("a.delivery")} icon={Truck} />
      <MiniStats stats={[
        { label: t("a.delivery"), value: zones.length },
        { label: t("a.active"), value: zones.filter((z) => z.active).length, tone: "ok" },
        { label: t("a.inactive"), value: zones.filter((z) => !z.active).length, tone: "warn" },
        { label: `${t("a.fee")} ($)`, value: Math.round(avg * 100) / 100, tone: "accent" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "zone")}
        reorder="zone"
        rows={rows}
        columns={[
          { key: "name", label: t("a.zoneName"), sortable: true },
          { key: "fee", label: t("a.fee"), sortable: true },
          { key: "free", label: t("a.freeOver"), sortable: true, hideOnMobile: true },
          { key: "active", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.add")}
        createEditor={<SaveForm action={saveZone} submitLabel={t("a.create")} resetOnSave>{fields()}</SaveForm>}
      />
    </>
  );
}
