import { db } from "@/lib/db";
import Link from "next/link";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate, money, num } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui";
import { Empty, PageHeader, TableWrap, tableCls, tdCls, thCls } from "@/components/admin/bits";

export const metadata = { title: "Customers" };
const PAGE = 50;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("customers.view");
  const sp = await searchParams;
  const q = sp.q;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, locale } = await adminT();
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q.replace(/\s/g, "") } }] } : {};
  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } } } }),
    db.customer.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `${adminBase()}/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title={t("a.customers")} subtitle={String(total)} />
      <form className="mb-5 flex gap-2"><Input name="q" defaultValue={q} placeholder={t("a.search")} className="max-w-72" /><Button variant="outline" type="submit">{t("a.filter")}</Button></form>
      {customers.length === 0 ? <Empty>{t("a.noData")}</Empty> : (
        <TableWrap>
          <table className={tableCls}>
            <thead><tr><th className={thCls}>{t("a.name")}</th><th className={thCls}>{t("a.phone")}</th><th className={thCls}>{t("a.email")}</th><th className={thCls}>{t("a.orders")}</th><th className={thCls}>{t("a.total")}</th><th className={thCls}>{t("a.date")}</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/50">
                  <td className={`${tdCls} font-semibold`}>{c.name} {c.passwordHash && <Badge tone="ok">✓</Badge>}</td>
                  <td className={tdCls} dir="ltr"><a href={`tel:${c.phone}`} className="hover:text-brand">{c.phone}</a></td>
                  <td className={tdCls} dir="ltr">{c.email}</td>
                  <td className={tdCls}>{c.orders.length}</td>
                  <td className={`${tdCls} font-bold`}>{money(c.orders.reduce((s, o) => s + num(o.total), 0))}</td>
                  <td className={`${tdCls} text-muted`}>{formatDate(c.createdAt, locale)}</td>
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
