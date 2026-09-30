import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { LOG_CATEGORIES } from "@/lib/audit";
import { auditWhere, type LogFilters } from "@/lib/audit-query";
import { formatDate } from "@/lib/utils";
import { AutoRefresh } from "@/components/admin/shell";
import { Empty, PageHeader, TableWrap, tableCls, tdCls, thCls } from "@/components/admin/bits";
import { Badge, Button, Input, Select } from "@/components/ui";

export const metadata = { title: "Activity log" };
const PAGE = 50;

const CAT_TONE: Record<string, "brand" | "accent" | "warn" | "danger" | "ok" | "muted"> = {
  auth: "brand", security: "danger", order: "accent", payment: "ok", catalog: "brand", content: "muted", staff: "warn", settings: "warn", customer: "accent", notification: "muted", system: "muted",
};
const LEVEL_TONE = { info: "muted", warn: "warn", error: "danger" } as const;

type SP = LogFilters & { page?: string; tab?: string; live?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const { t, locale } = await adminT();
  const base = adminBase();
  const tab = sp.tab === "notifications" ? "notifications" : "activity";
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: LogFilters = { q: sp.q, cat: sp.cat, level: sp.level, user: sp.user, from: sp.from, to: sp.to };
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.entries({ ...filters, tab, ...extra }).filter(([, v]) => v) as [string, string][]).toString();

  const tabs = (
    <div className="mb-5 flex gap-2">
      {(["activity", "notifications"] as const).map((k) => (
        <Link key={k} href={`${base}/audit?tab=${k}`} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === k ? "bg-brand text-brand-fg shadow-card" : "border border-border hover:bg-surface-2"}`}>
          {t(k === "activity" ? "a.logTabActivity" : "a.logTabNotifications")}
        </Link>
      ))}
    </div>
  );

  // ───────── notification deliveries ─────────
  if (tab === "notifications") {
    const [rows, total] = await Promise.all([
      db.notificationLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
      db.notificationLog.count(),
    ]);
    const orders = await db.order.findMany({ where: { id: { in: rows.map((r) => r.orderId).filter((x): x is string => !!x) } }, select: { id: true, number: true } });
    const num = new Map(orders.map((o) => [o.id, o.number]));
    const pages = Math.max(1, Math.ceil(total / PAGE));
    return (
      <>
        <AutoRefresh seconds={30} />
        <PageHeader title={t("a.audit")} subtitle={`${total}`} />
        {tabs}
        {rows.length === 0 ? <Empty>{t("a.noData")}</Empty> : (
          <TableWrap>
            <table className={tableCls}>
              <thead><tr><th className={thCls}>{t("a.when")}</th><th className={thCls}>{t("a.order")}</th><th className={thCls}>{t("a.logChannel")}</th><th className={thCls}>{t("a.status")}</th><th className={thCls}>{t("a.logError")}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${tdCls} whitespace-nowrap text-muted`}>{formatDate(r.createdAt, locale)}</td>
                    <td className={tdCls}>{r.orderId && num.get(r.orderId) ? <Link className="font-bold text-brand" href={`${base}/orders/${r.orderId}`}>JM-{String(num.get(r.orderId)).padStart(5, "0")}</Link> : "—"}</td>
                    <td className={`${tdCls} font-semibold capitalize`}>{r.channel}</td>
                    <td className={tdCls}><Badge tone={r.ok ? "ok" : "danger"}>{r.ok ? t("a.logDelivered") : t("a.logFailed")}</Badge></td>
                    <td className={`${tdCls} max-w-md truncate text-xs text-muted`} dir="ltr" title={r.error ?? ""}>{r.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            {page > 1 && <Link href={`${base}/audit?${qs({ page: String(page - 1) })}`} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.prev")}</Link>}
            <span className="text-muted">{page} / {pages}</span>
            {page < pages && <Link href={`${base}/audit?${qs({ page: String(page + 1) })}`} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.next")}</Link>}
          </div>
        )}
      </>
    );
  }

  // ───────── activity ─────────
  const where = auditWhere(filters);
  const [logs, total, users, warnCount] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
    db.auditLog.groupBy({ by: ["userName"], where: { hidden: false }, _count: { _all: true }, orderBy: { _count: { userName: "desc" } }, take: 60 }),
    db.auditLog.count({ where: { hidden: false, level: { in: ["warn", "error"] }, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      {sp.live === "1" && <AutoRefresh seconds={15} />}
      <PageHeader title={t("a.audit")} subtitle={`${total} · ${t("a.logWarn24", { n: warnCount })}`}>
        <Link href={`${base}/audit?${qs({ live: sp.live === "1" ? "" : "1" })}`} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">{sp.live === "1" ? t("a.logLiveOn") : t("a.logLiveOff")}</Link>
        <a href={`/api/admin/audit/export?${qs({})}`}><Button variant="outline" size="sm"><Download className="h-4 w-4" /> {t("a.logExport")}</Button></a>
      </PageHeader>
      {tabs}

      <form className="mb-5 grid gap-2 md:grid-cols-6" action={`${base}/audit`}>
        <Input name="q" defaultValue={sp.q} placeholder={t("a.logSearch")} className="md:col-span-2" />
        <Select name="cat" defaultValue={sp.cat ?? ""}>
          <option value="">{t("a.logCategory")}: {t("a.all")}</option>
          {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{t(`a.logCat_${c}`)}</option>)}
        </Select>
        <Select name="level" defaultValue={sp.level ?? ""}>
          <option value="">{t("a.logLevel")}: {t("a.all")}</option>
          {(["info", "warn", "error"] as const).map((l) => <option key={l} value={l}>{t(`a.logLvl_${l}`)}</option>)}
        </Select>
        <Select name="user" defaultValue={sp.user ?? ""}>
          <option value="">{t("a.logUser")}: {t("a.all")}</option>
          {users.map((u) => <option key={u.userName} value={u.userName}>{u.userName} ({u._count._all})</option>)}
        </Select>
        <div className="flex gap-2">
          <Input type="date" name="from" defaultValue={sp.from} aria-label={t("a.logFrom")} title={t("a.logFrom")} />
          <Input type="date" name="to" defaultValue={sp.to} aria-label={t("a.logTo")} title={t("a.logTo")} />
        </div>
        <div className="flex gap-2 md:col-span-6">
          <Button type="submit" variant="outline">{t("a.filter")}</Button>
          <Link href={`${base}/audit`} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-muted hover:bg-surface-2">{t("a.logClear")}</Link>
        </div>
      </form>

      {logs.length === 0 ? <Empty>{t("a.logNoResults")}</Empty> : (
        <TableWrap>
          <table className={tableCls}>
            <thead><tr><th className={thCls}>{t("a.when")}</th><th className={thCls}>{t("a.who")}</th><th className={thCls}>{t("a.logCategory")}</th><th className={thCls}>{t("a.what")}</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className={l.level === "error" ? "bg-danger/5" : l.level === "warn" ? "bg-warn/5" : ""}>
                  <td className={`${tdCls} whitespace-nowrap align-top text-muted`}>{formatDate(l.createdAt, locale)}</td>
                  <td className={`${tdCls} align-top`}><span className="block font-semibold">{l.userName}</span>{l.ip && <span className="text-xs text-muted" dir="ltr">{l.ip}</span>}</td>
                  <td className={`${tdCls} align-top`}>
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={CAT_TONE[l.category] ?? "muted"}>{t(`a.logCat_${l.category}`)}</Badge>
                      {l.level !== "info" && <Badge tone={LEVEL_TONE[l.level as "warn" | "error"] ?? "muted"}>{t(`a.logLvl_${l.level}`)}</Badge>}
                    </div>
                  </td>
                  <td className={`${tdCls} align-top`}>
                    <p>{l.summary || l.action}</p>
                    <details className="mt-1.5 text-xs text-muted">
                      <summary className="cursor-pointer select-none font-semibold hover:text-fg">{t("a.logDetails")}</summary>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" dir="ltr">
                        <dt>action</dt><dd><code className="rounded bg-surface-2 px-1.5 py-0.5">{l.action}</code></dd>
                        <dt>entity</dt><dd>{l.entity}{l.entityId ? ` · ${l.entityId}` : ""}</dd>
                        {l.userAgent && (<><dt>browser</dt><dd className="break-all">{l.userAgent}</dd></>)}
                        {l.meta != null && (<><dt>data</dt><dd><pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2">{JSON.stringify(l.meta, null, 2)}</pre></dd></>)}
                      </dl>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`${base}/audit?${qs({ page: String(page - 1) })}`} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.prev")}</Link>}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages && <Link href={`${base}/audit?${qs({ page: String(page + 1) })}`} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.next")}</Link>}
        </div>
      )}
    </>
  );
}
