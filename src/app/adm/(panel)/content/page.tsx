import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { CONTENT_GROUPS } from "@/lib/content-registry";
import { saveContent } from "@/actions/admin/content";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { ImageField } from "@/components/admin/image-field";
import { Field, Input, Switch, Textarea } from "@/components/ui";

export const metadata = { title: "Website content" };

export default async function ContentPage() {
  await requireStaff("content.edit");
  const { t, locale } = await adminT();
  const stored = await db.content.findMany();
  const map = new Map(stored.map((r) => [r.key, r]));

  const rows: Row[] = CONTENT_GROUPS.map((g) => {
    const edited = g.fields.filter((f) => map.has(f.key)).length;
    const preview = g.fields.slice(0, 3).map((f) => f.label[locale]).join(" · ");
    return {
      id: g.id,
      title: g.label[locale],
      subtitle: `${g.fields.length}`,
      search: `${g.label.en} ${g.label.ar} ${g.fields.map((f) => f.label.en + " " + f.label.ar).join(" ")}`,
      sort: { section: g.label[locale], fields: g.fields.length, edited },
      cells: {
        section: <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText className="h-5 w-5" /></span><div className="min-w-0"><p>{g.label[locale]}</p><p className="max-w-md truncate text-xs font-normal text-muted">{preview}…</p></div></div>,
        fields: <span className="font-bold">{g.fields.length}</span>,
        edited: (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all" style={{ width: `${(edited / g.fields.length) * 100}%` }} /></div>
            <span className="text-xs text-muted">{edited}/{g.fields.length}</span>
          </div>
        ),
      },
      editor: (
        <SaveForm action={saveContent} submitLabel={t("a.saveAll")}>
          <input type="hidden" name="group" value={g.id} />
          <div className="grid gap-5 md:grid-cols-2">
            {g.fields.map((f) => {
              const row = map.get(f.key);
              const en = row ? row.en : f.def.en;
              const ar = row ? row.ar : f.def.ar;
              const label = f.label[locale];

              if (f.type === "toggle") {
                return (
                  <div key={f.key} className="flex items-center md:col-span-2">
                    <input type="hidden" name={`tgm:${f.key}`} value="1" />
                    <Switch name={`tg:${f.key}`} defaultChecked={en === "1"} label={label} />
                  </div>
                );
              }
              if (f.type === "image") {
                return <div key={f.key} className="md:col-span-2"><ImageField name={`en:${f.key}`} defaultValue={en} label={label} /></div>;
              }
              const control = (name: string, value: string, dir?: "ltr" | "rtl") =>
                f.type === "textarea" ? <Textarea name={name} defaultValue={value} dir={dir} rows={3} /> : <Input name={name} defaultValue={value} dir={dir} />;
              if (!f.bilingual) {
                return <Field key={f.key} label={label} className="md:col-span-2">{control(`en:${f.key}`, en, "ltr")}</Field>;
              }
              return (
                <div key={f.key} className="grid gap-3 md:col-span-2 md:grid-cols-2">
                  <Field label={`${label} · ${t("a.fieldEn")}`}>{control(`en:${f.key}`, en)}</Field>
                  <Field label={`${label} · ${t("a.fieldAr")}`}>{control(`ar:${f.key}`, ar, "rtl")}</Field>
                </div>
              );
            })}
          </div>
        </SaveForm>
      ),
    };
  });

  const totalFields = CONTENT_GROUPS.reduce((n, g) => n + g.fields.length, 0);
  return (
    <>
      <PageHeader title={t("a.content")} subtitle={t("a.contentHelp")} icon={FileText} />
      <MiniStats stats={[
        { label: t("a.content"), value: CONTENT_GROUPS.length },
        { label: t("a.fields"), value: totalFields, tone: "accent" },
        { label: t("a.customised"), value: CONTENT_GROUPS.reduce((n, g) => n + g.fields.filter((f) => map.has(f.key)).length, 0), tone: "ok" },
      ]} />
      <DataTable
        wide
        rows={rows}
        columns={[
          { key: "section", label: t("a.content"), sortable: true },
          { key: "fields", label: t("a.fields"), sortable: true, hideOnMobile: true },
          { key: "edited", label: t("a.customised"), sortable: true },
        ]}
      />
    </>
  );
}
