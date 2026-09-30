"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useAdminBase } from "./admin-context";
import { Badge, Button, Card, Field, Input, Select, Spinner, Switch, Textarea } from "@/components/ui";
import { saveProduct } from "@/actions/admin/products";
import type { EditorPayload } from "@/lib/product-schema";
import { cn, imageUrl } from "@/lib/utils";

export type EditorInit = Omit<EditorPayload, "variants"> & {
  variants: (Omit<EditorPayload["variants"][number], "compareAt"> & { compareAt: number | null })[];
};

const uid = () => "n_" + Math.random().toString(36).slice(2, 10);
const vkey = (s: string | null, o: string | null) => `${s ?? "-"}|${o ?? "-"}`;

export function ProductEditor({
  init,
  categories,
  perms,
  imported,
}: {
  init: EditorInit;
  categories: { id: string; name: string }[];
  perms: { edit: boolean; price: boolean; stock: boolean };
  imported?: boolean;
}) {
  const { t } = useI18n();
  const base = useAdminBase();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    nameEn: init.nameEn, nameAr: init.nameAr, shortEn: init.shortEn, shortAr: init.shortAr, descEn: init.descEn, descAr: init.descAr,
    slug: init.slug, active: init.active, featured: init.featured, isNew: init.isNew, optionKind: init.optionKind, sortOrder: init.sortOrder,
  });
  const [categoryIds, setCategoryIds] = useState<string[]>(init.categoryIds);
  const [images, setImages] = useState(init.images);
  const [sizes, setSizes] = useState(init.sizes);
  const [options, setOptions] = useState(init.options);
  const [vmap, setVmap] = useState<Record<string, EditorInit["variants"][number]>>(() => Object.fromEntries(init.variants.map((v) => [vkey(v.sizeKey, v.optionKey), v])));

  const E = perms.edit;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  // one row per size × option combination
  const rows = useMemo(() => {
    const ss: (typeof sizes[number] | null)[] = sizes.length ? sizes : [null];
    const os: (typeof options[number] | null)[] = options.length ? options : [null];
    return ss.flatMap((s) =>
      os.map((o) => {
        const key = vkey(s?.key ?? null, o?.key ?? null);
        const label = [s?.labelEn, o?.labelEn].filter(Boolean).join(" · ") || t("a.defaultVariant");
        const v = vmap[key] ?? { sizeKey: s?.key ?? null, optionKey: o?.key ?? null, sku: "", price: 0, compareAt: null, stock: 0, active: true };
        return { key, label, v };
      }),
    );
  }, [sizes, options, vmap, t]);

  const patchV = (key: string, s: string | null, o: string | null, patch: Partial<EditorInit["variants"][number]>) =>
    setVmap((m) => ({ ...m, [key]: { ...(m[key] ?? { sizeKey: s, optionKey: o, sku: "", price: 0, compareAt: null, stock: 0, active: true }), ...patch } }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("file", file));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImages((prev) => [...prev, ...(data.paths as string[]).map((path) => ({ key: uid(), path, alt: "" }))]);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const n = [...arr];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  function submit() {
    setMsg(null);
    const payload: EditorPayload = {
      id: init.id,
      ...f,
      categoryIds,
      images,
      sizes,
      options,
      variants: rows.map(({ v }) => ({ ...v, sku: v.sku ?? "", compareAt: v.compareAt || null })),
    };
    start(async () => {
      const res = await saveProduct(payload);
      if (!res.ok) return setMsg({ ok: false, text: `${t("a.failed")} (${res.error})` });
      setMsg({ ok: true, text: t("a.edited") });
      if (!init.id) router.push(`${base}/products/${res.id}`);
      else router.refresh();
    });
  }

  const kindLabel = t(`a.kind${f.optionKind}`);

  return (
    <div className="space-y-6 pb-24">
      {imported && <p className="rounded-xl bg-warn/15 p-3 text-sm font-semibold text-warn">{t("a.importNote")}</p>}

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-bold">{t("a.basic")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("a.nameEn")}><Input value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} disabled={!E} /></Field>
          <Field label={t("a.nameAr")}><Input value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" disabled={!E} /></Field>
          <Field label={`${t("a.shortDesc")} (EN)`}><Textarea value={f.shortEn} onChange={(e) => set("shortEn", e.target.value)} rows={2} disabled={!E} /></Field>
          <Field label={`${t("a.shortDesc")} (AR)`}><Textarea value={f.shortAr} onChange={(e) => set("shortAr", e.target.value)} rows={2} dir="rtl" disabled={!E} /></Field>
          <Field label={`${t("a.desc")} (EN)`}><Textarea value={f.descEn} onChange={(e) => set("descEn", e.target.value)} rows={5} disabled={!E} /></Field>
          <Field label={`${t("a.desc")} (AR)`}><Textarea value={f.descAr} onChange={(e) => set("descAr", e.target.value)} rows={5} dir="rtl" disabled={!E} /></Field>
          <Field label={t("a.slug")} hint="/product/…"><Input value={f.slug} onChange={(e) => set("slug", e.target.value)} dir="ltr" disabled={!E} placeholder="auto" /></Field>
          <Field label={t("a.sort")}><Input type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} disabled={!E} /></Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{t("a.categoriesLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = categoryIds.includes(c.id);
              return (
                <button key={c.id} type="button" disabled={!E} onClick={() => setCategoryIds((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} className={cn("rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition", on ? "border-brand bg-brand-soft text-brand" : "border-border hover:border-brand/40")}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
          <Switch label={t("a.active")} defaultChecked={f.active} onChange={(v) => E && set("active", v)} />
          <Switch label={t("a.featured")} defaultChecked={f.featured} onChange={(v) => E && set("featured", v)} />
          <Switch label={t("a.isNew")} defaultChecked={f.isNew} onChange={(v) => E && set("isNew", v)} />
        </div>
      </Card>

      {/* photos */}
      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">{t("a.photos")}</h2><p className="text-sm text-muted">{t("a.photosHelp")}</p></div>
          {E && (
            <>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Spinner /> : <ImagePlus className="h-4 w-4" />} {uploading ? t("a.uploading") : t("a.upload")}
              </Button>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((im, i) => (
            <div key={im.key} className="space-y-2 rounded-xl border border-border p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(im.path)} alt="" className="h-full w-full object-contain p-1" />
                {i === 0 && <Badge className="absolute start-1.5 top-1.5">1</Badge>}
                {options.filter((o) => o.imageKey === im.key).map((o) => <Badge key={o.key} tone="accent" className="absolute bottom-1.5 start-1.5 max-w-[90%] truncate">{o.labelEn}</Badge>)}
              </div>
              <Input value={im.alt} onChange={(e) => setImages((a) => a.map((x) => (x.key === im.key ? { ...x, alt: e.target.value } : x)))} placeholder={t("a.altText")} className="h-9 text-xs" disabled={!E} />
              {E && (
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="rounded-lg border border-border p-1.5 hover:bg-surface-2" aria-label={t("a.moveUp")}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} className="rounded-lg border border-border p-1.5 hover:bg-surface-2" aria-label={t("a.moveDown")}><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => { setImages((a) => a.filter((x) => x.key !== im.key)); setOptions((o) => o.map((x) => (x.imageKey === im.key ? { ...x, imageKey: null } : x))); }} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" aria-label={t("a.remove")}><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* sizes */}
      <Card className="space-y-4 p-6">
        <div><h2 className="text-lg font-bold">{t("a.sizes")}</h2><p className="text-sm text-muted">{t("a.sizesHelp")}</p></div>
        {sizes.map((s) => (
          <div key={s.key} className="flex flex-wrap items-end gap-3">
            <Field label={t("a.labelEn")} className="min-w-40 flex-1"><Input value={s.labelEn} onChange={(e) => setSizes((a) => a.map((x) => (x.key === s.key ? { ...x, labelEn: e.target.value } : x)))} disabled={!E} /></Field>
            <Field label={t("a.labelAr")} className="min-w-40 flex-1"><Input value={s.labelAr} dir="rtl" onChange={(e) => setSizes((a) => a.map((x) => (x.key === s.key ? { ...x, labelAr: e.target.value } : x)))} disabled={!E} /></Field>
            {E && <Button type="button" variant="ghost" size="icon" onClick={() => setSizes((a) => a.filter((x) => x.key !== s.key))} aria-label={t("a.remove")}><Trash2 className="h-4 w-4 text-danger" /></Button>}
          </div>
        ))}
        {E && <Button type="button" variant="outline" size="sm" onClick={() => setSizes((a) => [...a, { key: uid(), labelEn: "", labelAr: "" }])}><Plus className="h-4 w-4" /> {t("a.addSize")}</Button>}
      </Card>

      {/* options */}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">{t("a.options")}</h2><p className="text-sm text-muted">{t("a.optionsHelp")}</p></div>
          <Field label={t("a.optionKind")}>
            <Select value={f.optionKind} onChange={(e) => set("optionKind", e.target.value as typeof f.optionKind)} disabled={!E} className="h-10 w-auto">
              <option value="SCENT">{t("a.kindSCENT")}</option><option value="COLOR">{t("a.kindCOLOR")}</option><option value="TYPE">{t("a.kindTYPE")}</option>
            </Select>
          </Field>
        </div>
        {options.map((o) => (
          <div key={o.key} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3">
            <Field label={`${kindLabel} (EN)`} className="min-w-36 flex-1"><Input value={o.labelEn} onChange={(e) => setOptions((a) => a.map((x) => (x.key === o.key ? { ...x, labelEn: e.target.value } : x)))} disabled={!E} /></Field>
            <Field label={`${kindLabel} (AR)`} className="min-w-36 flex-1"><Input value={o.labelAr} dir="rtl" onChange={(e) => setOptions((a) => a.map((x) => (x.key === o.key ? { ...x, labelAr: e.target.value } : x)))} disabled={!E} /></Field>
            <Field label={t("a.linkedPhoto")} className="min-w-44">
              <div className="flex items-center gap-2">
                {o.imageKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(images.find((i) => i.key === o.imageKey)?.path)} alt="" className="h-11 w-11 rounded-lg border border-border bg-white object-contain" />
                )}
                <Select value={o.imageKey ?? ""} onChange={(e) => setOptions((a) => a.map((x) => (x.key === o.key ? { ...x, imageKey: e.target.value || null } : x)))} disabled={!E}>
                  <option value="">{t("a.noPhoto")}</option>
                  {images.map((im, i) => <option key={im.key} value={im.key}>#{i + 1}</option>)}
                </Select>
              </div>
            </Field>
            {f.optionKind === "COLOR" && (
              <Field label={t("a.swatch")}><input type="color" value={o.swatch || "#cccccc"} onChange={(e) => setOptions((a) => a.map((x) => (x.key === o.key ? { ...x, swatch: e.target.value } : x)))} disabled={!E} className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-surface" /></Field>
            )}
            {E && <Button type="button" variant="ghost" size="icon" onClick={() => setOptions((a) => a.filter((x) => x.key !== o.key))} aria-label={t("a.remove")}><Trash2 className="h-4 w-4 text-danger" /></Button>}
          </div>
        ))}
        {E && <Button type="button" variant="outline" size="sm" onClick={() => setOptions((a) => [...a, { key: uid(), labelEn: "", labelAr: "", swatch: null, imageKey: null }])}><Plus className="h-4 w-4" /> {t("a.addOption")}</Button>}
      </Card>

      {/* variants */}
      <Card className="space-y-4 p-6">
        <div><h2 className="text-lg font-bold">{t("a.variants")}</h2><p className="text-sm text-muted">{t("a.variantsHelp")}</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-start text-xs font-bold uppercase tracking-wide text-muted">
                <th className="pb-2 pe-3 text-start"> </th><th className="pb-2 pe-3 text-start">{t("a.sku")}</th><th className="pb-2 pe-3 text-start">{t("a.price")} ($)</th><th className="pb-2 pe-3 text-start">{t("a.comparePrice")}</th><th className="pb-2 pe-3 text-start">{t("a.stock")}</th><th className="pb-2 text-start">{t("a.active")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, label, v }) => (
                <tr key={key} className="border-t border-border/60">
                  <td className="py-2 pe-3 font-semibold">{label}</td>
                  <td className="py-2 pe-3"><Input value={v.sku ?? ""} onChange={(e) => patchV(key, v.sizeKey, v.optionKey, { sku: e.target.value })} className="h-9 w-28" disabled={!E} dir="ltr" /></td>
                  <td className="py-2 pe-3"><Input type="number" step="0.01" min={0} value={v.price} onChange={(e) => patchV(key, v.sizeKey, v.optionKey, { price: Number(e.target.value) })} className="h-9 w-24" disabled={!perms.price} /></td>
                  <td className="py-2 pe-3"><Input type="number" step="0.01" min={0} value={v.compareAt ?? ""} onChange={(e) => patchV(key, v.sizeKey, v.optionKey, { compareAt: e.target.value ? Number(e.target.value) : null })} className="h-9 w-24" disabled={!perms.price} /></td>
                  <td className="py-2 pe-3"><Input type="number" min={0} value={v.stock} onChange={(e) => patchV(key, v.sizeKey, v.optionKey, { stock: Number(e.target.value) })} className="h-9 w-24" disabled={!perms.stock} /></td>
                  <td className="py-2"><input type="checkbox" checked={v.active} onChange={(e) => patchV(key, v.sizeKey, v.optionKey, { active: e.target.checked })} disabled={!E} className="h-5 w-5 accent-[var(--brand)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 p-3 backdrop-blur-xl lg:start-[260px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-2">
          <p className={cn("text-sm font-semibold", msg?.ok ? "text-ok" : "text-danger")}>{msg?.text}</p>
          <Button onClick={submit} disabled={pending || uploading} size="lg">{pending && <Spinner />} {t("a.save")}</Button>
        </div>
      </div>
    </div>
  );
}
