import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { adminBase, can, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate, money, num, orderCode, pick } from "@/lib/utils";
import { AutoRefresh } from "@/components/admin/shell";
import { OrderStatusBadge, PageHeader, StatCard, TableWrap, tableCls, tdCls, thCls } from "@/components/admin/bits";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireStaff();
  const { t, locale } = await adminT();
  const base = adminBase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const showOrders = can(user, "orders.view");
  const visibleOrder: Prisma.OrderWhereInput = { NOT: { paymentMethod: "WHISH", paymentStatus: { in: ["PENDING", "FAILED", "UNPAID"] } } };

  const [today, pending, recent, low] = await Promise.all([
    showOrders ? db.order.findMany({ where: { createdAt: { gte: start }, status: { not: "CANCELLED" }, ...visibleOrder }, select: { total: true } }) : [],
    showOrders ? db.order.count({ where: { status: { in: ["NEW", "CONFIRMED", "PREPARING"] }, ...visibleOrder } }) : 0,
    showOrders ? db.order.findMany({ where: visibleOrder, orderBy: { createdAt: "desc" }, take: 8 }) : [],
    can(user, "stock.update") || can(user, "products.view")
      ? db.variant.findMany({ where: { active: true, stock: { lte: 5 }, product: { active: true } }, include: { product: true, size: true, option: true }, orderBy: { stock: "asc" }, take: 8 })
      : [],
  ]);

  return (
    <>
      {showOrders && <AutoRefresh />}
      <PageHeader title={t("a.dashboard")} subtitle={t("a.autoRefresh")} />

      {showOrders && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label={t("a.todayOrders")} value={today.length} />
          <StatCard label={t("a.todayRevenue")} value={money(today.reduce((s, o) => s + num(o.total), 0))} tone="accent" />
          <StatCard label={t("a.pendingOrders")} value={pending} tone="warn" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {showOrders && (
          <section>
            <h2 className="mb-3 text-lg font-bold">{t("a.recentOrders")}</h2>
            <TableWrap>
              <table className={tableCls}>
                <thead><tr><th className={thCls}>#</th><th className={thCls}>{t("a.customer")}</th><th className={thCls}>{t("a.total")}</th><th className={thCls}>{t("a.status")}</th><th className={thCls}>{t("a.date")}</th></tr></thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="hover:bg-surface-2/50">
                      <td className={tdCls}><Link className="font-bold text-brand" href={`${base}/orders/${o.id}`} dir="ltr">{orderCode(o.number)}</Link></td>
                      <td className={tdCls}>{o.name}</td>
                      <td className={`${tdCls} font-semibold`}>{money(o.total)}</td>
                      <td className={tdCls}><OrderStatusBadge status={o.status} label={t(`order.status${o.status}`)} /></td>
                      <td className={`${tdCls} text-muted`}>{formatDate(o.createdAt, locale)}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted">{t("a.noData")}</td></tr>}
                </tbody>
              </table>
            </TableWrap>
          </section>
        )}

        {low.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">{t("a.lowStock")}</h2>
            <div className="space-y-2">
              {low.map((v) => (
                <Link key={v.id} href={`${base}/products/${v.productId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm shadow-card hover:border-brand/40">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{pick(locale, v.product.nameEn, v.product.nameAr)}</span>
                    <span className="text-xs text-muted">{[v.size && pick(locale, v.size.labelEn, v.size.labelAr), v.option && pick(locale, v.option.labelEn, v.option.labelAr)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${v.stock === 0 ? "bg-danger/15 text-danger" : "bg-warn/20 text-warn"}`}>{v.stock}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
