import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff } from "lucide-react";
import { db } from "@/lib/db";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate } from "@/lib/utils";
import { PageHeader, TableWrap, tableCls, tdCls, thCls } from "@/components/admin/bits";
import { Badge } from "@/components/ui";

const PAGE = 50;

/**
 * Hard-coded, read-only page for the hidden support account only.
 * Anyone else (including the owner) gets a plain 404, as if the page did not exist. No settings, no filters that change anything.
 */
export default async function SupportLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const me = await requireStaff();
  if (!me.hidden) notFound();
  const { t, locale } = await adminT();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where: { hidden: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where: { hidden: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const base = adminBase();

  return (
    <>
      <PageHeader title={t("a.support")} subtitle={t("a.supportHelp")} icon={EyeOff} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-14 text-center text-muted">{t("a.noData")}</p>
      ) : (
        <TableWrap>
          <table className={tableCls}>
            <thead><tr><th className={thCls}>{t("a.when")}</th><th className={thCls}>{t("a.what")}</th><th className={thCls}>IP</th><th className={thCls}>{t("a.status")}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50">
                  <td className={`${tdCls} whitespace-nowrap text-muted`}>{formatDate(r.createdAt, locale)}</td>
                  <td className={tdCls}><p className="font-semibold" dir="auto">{r.summary || r.action}</p><p className="text-xs text-muted" dir="ltr">{r.action}{r.userAgent ? ` Â· ${r.userAgent.slice(0, 60)}` : ""}</p></td>
                  <td className={`${tdCls} text-muted`} dir="ltr">{r.ip ?? "â€”"}</td>
                  <td className={tdCls}><Badge tone={r.level === "error" ? "danger" : r.level === "warn" ? "warn" : "muted"}>{r.level}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`${base}/support?page=${page - 1}`} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.prev")}</Link>}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages && <Link href={`${base}/support?page=${page + 1}`} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.next")}</Link>}
        </div>
      )}
    </>
  );
}
