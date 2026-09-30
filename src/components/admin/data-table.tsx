"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, GripVertical, Pencil, Plus, Search, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { bulkRun, reorderRows } from "@/actions/admin/bulk";
import { cn } from "@/lib/utils";

/* ───────────── slide-over drawer (holds the edit / create forms) ───────────── */

const DrawerCtx = React.createContext<{ close: () => void } | null>(null);
/** Lets a form inside the drawer close it after a successful save (no "unsaved" question then). */
export const useDrawerClose = () => React.useContext(DrawerCtx)?.close;

export function Drawer({ open, onClose, title, subtitle, wide, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; wide?: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  const [rtl, setRtl] = React.useState(false);
  const dirty = React.useRef(false);
  React.useEffect(() => { setMounted(true); setRtl(document.documentElement.dir === "rtl"); dirty.current = false; }, [open]);

  const forceClose = React.useCallback(() => { dirty.current = false; onClose(); }, [onClose]);
  // closing by X / backdrop / Esc asks first when something was typed and not saved
  const tryClose = React.useCallback(() => {
    if (dirty.current && !window.confirm(t("a.unsavedAsk"))) return;
    forceClose();
  }, [forceClose, t]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && tryClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, tryClose]);

  if (!mounted) return null;
  const off = rtl ? "-100%" : "100%";
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={tryClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: off }}
            animate={{ x: 0 }}
            exit={{ x: off }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className={cn("absolute inset-y-0 end-0 flex w-full flex-col border-s border-border bg-bg shadow-2xl", wide ? "max-w-4xl" : "max-w-2xl")}
          >
            <div className="relative flex items-center justify-between gap-3 overflow-hidden border-b border-border bg-surface px-6 py-4">
              <div className="pointer-events-none absolute -end-10 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-brand to-accent opacity-20 blur-2xl" />
              <div className="relative min-w-0">
                <h2 className="truncate text-xl font-black">{title}</h2>
                {subtitle && <p className="truncate text-sm text-muted" dir="auto">{subtitle}</p>}
              </div>
              <button onClick={tryClose} aria-label={t("a.close")} className="relative rounded-xl p-2 transition hover:rotate-90 hover:bg-surface-2"><X className="h-5 w-5" /></button>
            </div>
            <DrawerCtx.Provider value={{ close: forceClose }}>
              <div className="flex-1 overflow-y-auto p-6" onInputCapture={() => { dirty.current = true; }}>{children}</div>
            </DrawerCtx.Provider>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ───────────── the table ───────────── */

export type Column = { key: string; label: string; sortable?: boolean; className?: string; hideOnMobile?: boolean };
export type Row = {
  id: string;
  /** what each column shows */
  cells: Record<string, React.ReactNode>;
  /** plain-text values used for sorting */
  sort?: Record<string, string | number>;
  /** text the search box matches against (client mode) */
  search: string;
  /** drawer title + subtitle for this record */
  title: string;
  subtitle?: string;
  /** the (server-rendered) edit form shown in the drawer */
  editor?: React.ReactNode;
  /** open a page instead of the drawer (used by products) */
  href?: string;
  /** extra always-visible buttons (toggle, delete…) */
  actions?: React.ReactNode;
};

export type BulkConfig = { table: string; ops: { op: string; label: string; tone?: "danger"; confirm?: string }[] };
export type Paging = { page: number; pages: number; total: number; q?: string; params?: Record<string, string>; filters?: React.ReactNode };

export function DataTable({ columns, rows, createLabel, createTitle, createEditor, wide, editLabel, empty, bulk, reorder, paging }: {
  columns: Column[];
  rows: Row[];
  createLabel?: string;
  createTitle?: string;
  createEditor?: React.ReactNode;
  wide?: boolean;
  editLabel?: string;
  empty?: string;
  /** tick rows and run one action on all of them */
  bulk?: BulkConfig;
  /** table name whose rows can be re-ordered by dragging (writes sortOrder) */
  reorder?: string;
  /** server-side paging + search (the page loads only one slice of rows) */
  paging?: Paging;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null); // row id, "__new" or null
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  const close = React.useCallback(() => setOpenId(null), []);

  // local order (for drag & drop); follows the server order whenever the rows change
  const [order, setOrder] = React.useState<string[]>(() => rows.map((r) => r.id));
  const sig = rows.map((r) => r.id).join("|");
  React.useEffect(() => { setOrder(rows.map((r) => r.id)); setPicked(new Set()); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const dragId = React.useRef<string | null>(null);
  const [armed, setArmed] = React.useState<string | null>(null);

  const dragEnabled = !!reorder && !q && !sort && !paging;

  const shown = React.useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    let r = order.map((id) => byId.get(id)).filter((x): x is Row => !!x);
    if (!paging) {
      const needle = q.trim().toLowerCase();
      if (needle) r = r.filter((x) => x.search.toLowerCase().includes(needle));
    }
    if (sort) {
      r = r.slice().sort((a, b) => {
        const av = a.sort?.[sort.key] ?? "";
        const bv = b.sort?.[sort.key] ?? "";
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })) * sort.dir;
      });
    }
    return r;
  }, [rows, order, q, sort, paging]);

  const current = openId && openId !== "__new" ? rows.find((r) => r.id === openId) : null;
  const allPicked = shown.length > 0 && shown.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.id)));
  const toggleOne = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function runBulk(op: string, confirmText?: string) {
    if (!bulk || picked.size === 0) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setNote("");
    try {
      const res = await bulkRun(bulk.table, op, [...picked]);
      setNote(res.ok ? t("a.bkDone", { n: res.count }) : t("a.failed"));
      setPicked(new Set());
      router.refresh();
    } catch {
      setNote(t("a.failed"));
    } finally {
      setBusy(false);
      setTimeout(() => setNote(""), 3500);
    }
  }

  async function saveOrder(ids: string[]) {
    if (!reorder) return;
    try {
      await reorderRows(reorder, ids);
      router.refresh();
    } catch {
      setNote(t("a.failed"));
    }
  }

  const pageLink = (p: number) => `${pathname}?${new URLSearchParams({ ...(paging?.params ?? {}), ...(paging?.q ? { q: paging.q } : {}), page: String(p) })}`;
  const colSpan = columns.length + 1 + (bulk ? 1 : 0) + (reorder ? 1 : 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {paging ? (
          <form method="get" className="flex flex-1 flex-wrap items-center gap-2">
            {Object.entries(paging.params ?? {}).filter(([k]) => k !== "page").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <div className="group relative min-w-56 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition group-focus-within:text-brand" />
              <input name="q" defaultValue={paging.q} placeholder={t("a.searchHere")} className="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-3 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25" />
            </div>
            {paging.filters}
            <Button type="submit" variant="outline">{t("a.filter")}</Button>
          </form>
        ) : (
          <div className="group relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition group-focus-within:text-brand" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("a.searchHere")} className="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-3 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25" />
          </div>
        )}
        <span className="text-sm font-medium text-muted">{paging ? t("a.recordsCount", { n: paging.total }) : q ? t("a.ofTotal", { n: shown.length }) : t("a.recordsCount", { n: rows.length })}</span>
        {dragEnabled && <span className="hidden text-xs text-muted md:inline">↕ {t("a.bkDragHint")}</span>}
        {createEditor && (
          <Button className="ms-auto" onClick={() => setOpenId("__new")}><Plus className="h-4 w-4" /> {createLabel ?? t("a.add")}</Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-b from-surface-2/80 to-surface-2/30">
              {reorder && <th className="w-px border-b border-border" />}
              {bulk && (
                <th className="w-px border-b border-border px-4 py-3.5">
                  <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label={t("a.all")} className="h-4 w-4 cursor-pointer accent-[var(--brand)]" />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={cn("whitespace-nowrap border-b border-border px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wide text-muted", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                    {c.sortable ? (
                      <button type="button" onClick={() => setSort(active ? (sort!.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })} className={cn("inline-flex items-center gap-1 uppercase transition hover:text-fg", active && "text-brand")}>
                        {c.label}
                        {active ? (sort!.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
              <th className="w-px border-b border-border px-4 py-3.5 text-end text-xs font-bold uppercase tracking-wide text-muted">{t("a.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const cells = (
                <>
                  {reorder && (
                    <td className="w-px ps-3">
                      {dragEnabled && (
                        <span onMouseDown={() => setArmed(r.id)} onMouseUp={() => setArmed(null)} className="flex cursor-grab touch-none text-muted transition hover:text-brand active:cursor-grabbing" aria-hidden><GripVertical className="h-4 w-4" /></span>
                      )}
                    </td>
                  )}
                  {bulk && (
                    <td className="w-px px-4">
                      <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggleOne(r.id)} aria-label="select" className="h-4 w-4 cursor-pointer accent-[var(--brand)]" />
                    </td>
                  )}
                  {columns.map((c, ci) => (
                    <td key={c.key} className={cn("px-4 py-3 align-middle", c.hideOnMobile && "hidden md:table-cell", ci === 0 && "relative font-semibold", c.className)}>
                      {ci === 0 && <span className="absolute inset-y-2 start-0 w-1 origin-center scale-y-0 rounded-full bg-gradient-to-b from-brand to-accent transition-transform duration-300 group-hover/row:scale-y-100" />}
                      {r.cells[c.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {r.actions}
                      {!r.href && !r.editor ? null : r.href ? (
                        <Link href={r.href} className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-soft px-3 text-sm font-semibold text-brand transition hover:-translate-y-0.5 hover:opacity-80 hover:shadow-card"><Pencil className="h-3.5 w-3.5" /> {editLabel ?? t("a.edit")}</Link>
                      ) : (
                        <Button size="sm" variant="soft" onClick={() => setOpenId(r.id)} className="hover:-translate-y-0.5 hover:shadow-card"><Pencil className="h-3.5 w-3.5" /> {editLabel ?? t("a.edit")}</Button>
                      )}
                    </div>
                  </td>
                </>
              );
              const cls = cn("group/row relative border-b border-border/60 transition-colors last:border-0 hover:bg-brand-soft/40", picked.has(r.id) && "bg-brand-soft/60");
              // rows that can be dragged are plain <tr> (framer's motion.tr owns the drag events)
              return dragEnabled ? (
                <tr
                  key={r.id}
                  draggable={armed === r.id}
                  onDragStart={(e) => { dragId.current = r.id; e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const from = dragId.current;
                    if (!from || from === r.id) return;
                    setOrder((o) => { const n = o.filter((x) => x !== from); n.splice(n.indexOf(r.id) + (o.indexOf(from) < o.indexOf(r.id) ? 1 : 0), 0, from); return n; });
                  }}
                  onDragEnd={() => { dragId.current = null; setArmed(null); saveOrder(order); }}
                  onDoubleClick={() => r.editor && setOpenId(r.id)}
                  style={{ animation: `rowin 0.45s ${Math.min(i, 12) * 0.045}s both` }}
                  className={cls}
                >
                  {cells}
                </tr>
              ) : (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.045, ease: [0.22, 1, 0.36, 1] }}
                  onDoubleClick={() => (r.href ? router.push(r.href) : r.editor && setOpenId(r.id))}
                  className={cls}
                >
                  {cells}
                </motion.tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={colSpan} className="py-14 text-center text-muted">{rows.length === 0 ? (empty ?? t("a.noData")) : t("a.noResults")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {paging && paging.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {paging.page > 1 && <Link href={pageLink(paging.page - 1)} className="rounded-xl border border-border px-4 py-2 font-semibold transition hover:bg-surface-2">{t("a.prev")}</Link>}
          <span className="text-muted">{paging.page} / {paging.pages}</span>
          {paging.page < paging.pages && <Link href={pageLink(paging.page + 1)} className="rounded-xl border border-border px-4 py-2 font-semibold transition hover:bg-surface-2">{t("a.next")}</Link>}
        </div>
      )}

      {/* bulk action bar */}
      <AnimatePresence>
        {bulk && (picked.size > 0 || note) && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 300 }} className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-glow">
            {picked.size > 0 ? (
              <>
                <span className="inline-flex items-center gap-2 text-sm font-bold"><Check className="h-4 w-4 text-brand" /> {t("a.bkSelected", { n: picked.size })}</span>
                {bulk.ops.map((o) => (
                  <Button key={o.op} size="sm" variant={o.tone === "danger" ? "danger" : "outline"} disabled={busy} onClick={() => runBulk(o.op, o.confirm)}>{busy && <Spinner />} {o.label}</Button>
                ))}
                <button type="button" onClick={() => setPicked(new Set())} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label={t("a.cancel")}><X className="h-4 w-4" /></button>
              </>
            ) : (
              <span className="text-sm font-semibold text-ok">{note}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer open={openId !== null} onClose={close} wide={wide} title={openId === "__new" ? (createTitle ?? createLabel ?? t("a.add")) : (current?.title ?? "")} subtitle={current?.subtitle}>
        {openId === "__new" ? createEditor : current?.editor}
      </Drawer>
    </>
  );
}

/** Coloured on/off dot + label for the "active / visible" columns. */
export function StatusDot({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold", on ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted")}>
      <span className="relative flex h-2 w-2">
        {on && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", on ? "bg-ok" : "bg-muted")} />
      </span>
      {on ? onLabel : offLabel}
    </span>
  );
}

/** Round thumbnail (or coloured initial) for the first column. */
export function Thumb({ src, letter, className }: { src?: string; letter?: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={cn("h-11 w-11 shrink-0 rounded-xl border border-border bg-white object-contain p-0.5", className)} />
  ) : (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent font-black text-white", className)}>{(letter ?? "?").slice(0, 1).toUpperCase()}</span>
  );
}
