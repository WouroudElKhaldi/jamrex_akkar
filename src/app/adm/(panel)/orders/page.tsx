import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate, money, orderCode } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/permissions";
import { AutoRefresh } from "@/components/admin/shell";
import { Empty, OrderStatusBadge, PAY_TONE, PageHeader, TableWrap, tableCls, tdCls, thCls } from "@/components/admin/bits";
import { Badge, Button, Input, Select } from "@/components/ui";

export const metadata = { title: "Orders" };
const PAGE = 30;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaff("orders.view");
  const sp = await searchParams;
  const { t, locale } = await adminT();
  const base = adminBase();
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  if (sp.q) {
    const q = sp.q.trim();
    const n = Number(q.replace(/\D/g, ""));
    where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\s/g, "") } }, { email: { contains: q, mode: "insensitive" } }, ...(n ? [{ number: n }] : [])];
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `${base}/orders?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;

  return (
    <>
      <AutoRefresh />
      <PageHeader title={t("a.orders")} subtitle={t("a.autoRefresh")} />
      <form className="mb-5 flex flex-wrap gap-2">
        <Input name="q" defaultValue={sp.q} placeholder={t("a.search")} className="max-w-64" />
        <Select name="status" defaultValue={sp.status ?? ""} className="w-auto">
          <option value="">{t("a.all")}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{t(`order.status${s}`)}</option>)}
        </Select>
        <Button type="submit" variant="outline">{t("a.filter")}</Button>
      </form>

      {orders.length === 0 ? (
        <Empty>{t("a.noData")}</Empty>
      ) : (
        <TableWrap>
          <table className={tableCls}>
            <thead>
              <tr><th className={thCls}>#</th><th className={thCls}>{t("a.customer")}</th><th className={thCls}>{t("a.zone")}</th><th className={thCls}>{t("a.total")}</th><th className={thCls}>{t("a.payment")}</th><th className={thCls}>{t("a.status")}</th><th className={thCls}>{t("a.date")}</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2/50">
                  <td className={tdCls}>
                    <Link href={`${base}/orders/${o.id}`} className="font-bold text-brand" dir="ltr">{orderCode(o.number)}</Link>
                    {o.flag && <Badge tone="warn" className="ms-2">⚠</Badge>}
                  </td>
                  <td className={tdCls}><span className="block font-semibold">{o.name}</span><span className="text-xs text-muted" dir="ltr">{o.phone}</span></td>
                  <td className={tdCls}>{o.zoneName}</td>
                  <td className={`${tdCls} font-bold`}>{money(o.total)}</td>
                  <td className={tdCls}><Badge tone={PAY_TONE[o.paymentStatus]}>{t(`order.pay${o.paymentStatus}`)}</Badge> <span className="text-xs text-muted">{o.paymentMethod === "WHISH" ? "Whish" : "COD"}</span></td>
                  <td className={tdCls}><OrderStatusBadge status={o.status} label={t(`order.status${o.status}`)} /></td>
                  <td className={`${tdCls} whitespace-nowrap text-muted`}>{formatDate(o.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={link(page - 1)} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.prev")}</Link>}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages && <Link href={link(page + 1)} className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-surface-2">{t("a.next")}</Link>}
        </div>
      )}
    </>
  );
}
