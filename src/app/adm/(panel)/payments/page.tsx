import { Banknote, CheckCircle2, CreditCard, Wallet, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { getSiteContent } from "@/lib/content";
import { whishConfigured } from "@/lib/whish";
import { formatDate, money, num, orderCode } from "@/lib/utils";
import { savePayments } from "@/actions/admin/settings";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { SaveForm } from "@/components/admin/save-form";
import { Badge, Card, Switch } from "@/components/ui";

export const metadata = { title: "Payments" };
const PAGE = 30;

const LEVEL_TONE = { info: "muted", warn: "warn", error: "danger" } as const;
const ACTION_TONE: Record<string, "ok" | "warn" | "danger" | "brand"> = { "payment.created": "brand", "payment.confirmed": "ok", "payment.expired": "warn", "payment.refunded": "warn", "payment.create.failed": "danger", "order.refund": "warn" };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("payments.manage");
  const sp = await searchParams;
  const { t, locale } = await adminT();
  const base = adminBase();
  const c = await getSiteContent();
  const page = Math.max(1, Number(sp.page) || 1);
  const keys = whishConfigured();

  const logWhere = { hidden: false, category: "payment", ...(sp.q ? { OR: [{ summary: { contains: sp.q, mode: "insensitive" as const } }, { action: { contains: sp.q, mode: "insensitive" as const } }] } : {}) };
  const [logs, logTotal, whishOrders, paid, pending, failed, money$] = await Promise.all([
    db.auditLog.findMany({ where: logWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where: logWhere }),
    db.order.findMany({ where: { paymentMethod: "WHISH" }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, number: true, total: true, paymentStatus: true, status: true, createdAt: true, name: true } }),
    db.order.count({ where: { paymentMethod: "WHISH", paymentStatus: "PAID" } }),
    db.order.count({ where: { paymentMethod: "WHISH", paymentStatus: { in: ["PENDING", "UNPAID"] }, status: { not: "CANCELLED" } } }),
    db.order.count({ where: { paymentMethod: "WHISH", OR: [{ paymentStatus: "FAILED" }, { paymentStatus: { in: ["PENDING", "UNPAID"] }, status: "CANCELLED" }] } }),
    db.order.aggregate({ where: { paymentMethod: "WHISH", paymentStatus: "PAID" }, _sum: { total: true } }),
  ]);

  // order numbers for the log rows that point at an order
  const orderIds = [...new Set(logs.filter((l) => l.entity === "order" && l.entityId).map((l) => l.entityId!))];
  const nums = new Map((await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, number: true } })).map((o) => [o.id, o.number]));

  const logRows: Row[] = logs.map((l) => {
    const n = l.entityId ? nums.get(l.entityId) : undefined;
    return {
      id: l.id,
      title: l.summary,
      search: l.summary,
      href: l.entityId && n ? `${base}/orders/${l.entityId}` : undefined,
      cells: {
        when: <span className="whitespace-nowrap text-muted">{formatDate(l.createdAt, locale)}</span>,
        event: <Badge tone={ACTION_TONE[l.action] ?? "muted"}>{l.action.replace("payment.", "")}</Badge>,
        order: n ? <span className="font-bold text-brand" dir="ltr">{orderCode(n)}</span> : <span className="text-muted">—</span>,
        what: <span className="block max-w-xl font-medium" dir="auto">{l.summary}</span>,
        level: <Badge tone={LEVEL_TONE[l.level as keyof typeof LEVEL_TONE] ?? "muted"}>{l.level}</Badge>,
      },
    };
  });

  const orderRows: Row[] = whishOrders.map((o) => ({
    id: o.id,
    title: orderCode(o.number),
    search: `${orderCode(o.number)} ${o.name}`,
    href: `${base}/orders/${o.id}`,
    sort: { order: o.number, total: num(o.total), date: o.createdAt.getTime() },
    cells: {
      order: <span className="font-bold" dir="ltr">{orderCode(o.number)}</span>,
      customer: <span className="text-muted">{o.name}</span>,
      total: <span className="font-black text-brand">{money(o.total)}</span>,
      pay: <Badge tone={o.paymentStatus === "PAID" ? "ok" : o.paymentStatus === "FAILED" ? "danger" : "warn"}>{t(`order.pay${o.paymentStatus}`)}</Badge>,
      date: <span className="text-muted">{formatDate(o.createdAt, locale)}</span>,
    },
  }));

  return (
    <>
      <PageHeader title={t("a.payments")} subtitle={t("a.pmHelp")} icon={Wallet} />

      <Card className="mb-6 p-6">
        <SaveForm action={savePayments}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ok/15 text-ok"><Banknote className="h-5 w-5" /></span><div><p className="font-black">{t("a.pmCod")}</p><p className="text-sm text-muted">{t("a.pmCodText")}</p></div></div>
              <Switch name="cod" defaultChecked={c.on("payments.cod.enabled")} label={t("a.codOn")} />
            </div>
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><CreditCard className="h-5 w-5" /></span><div><p className="font-black">{t("a.pmWhish")}</p><p className="text-sm text-muted">{t("a.pmWhishText")}</p></div></div>
              <Switch name="whish" defaultChecked={c.on("payments.whish.enabled")} label={t("a.whishOn")} />
              <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${keys ? "text-ok" : "text-warn"}`}>{keys ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{keys ? t("a.pmWhishKeys") : t("a.pmWhishNoKeys")}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">{t("a.pmSaved")}</p>
        </SaveForm>
      </Card>

      <MiniStats stats={[
        { label: t("a.pmWhishOrders"), value: paid + pending + failed },
        { label: t("a.pmWhishPaid"), value: paid, tone: "ok" },
        { label: t("a.pmWhishPending"), value: pending, tone: "warn" },
        { label: t("a.pmWhishFailed"), value: failed, tone: "danger" },
      ]} />
      <p className="-mt-3 mb-6 text-sm font-semibold text-muted">{t("a.pmWhishMoney")}: <span className="text-ok">{money(money$._sum.total ?? 0)}</span></p>

      <h2 className="mb-3 text-xl font-black">{t("a.pmWhishOrders")}</h2>
      <div className="mb-10">
        <DataTable
          rows={orderRows}
          editLabel={t("a.view")}
          columns={[
            { key: "order", label: t("a.order"), sortable: true },
            { key: "customer", label: t("a.customer"), hideOnMobile: true },
            { key: "total", label: t("a.total"), sortable: true },
            { key: "pay", label: t("a.payment") },
            { key: "date", label: t("a.date"), sortable: true, hideOnMobile: true },
          ]}
        />
      </div>

      <h2 className="text-xl font-black">{t("a.pmLogs")}</h2>
      <p className="mb-3 text-sm text-muted">{t("a.pmLogsHelp")}</p>
      <DataTable
        rows={logRows}
        editLabel={t("a.view")}
        paging={{ page, pages: Math.max(1, Math.ceil(logTotal / PAGE)), total: logTotal, q: sp.q }}
        columns={[
          { key: "when", label: t("a.when") },
          { key: "event", label: t("a.pmLogs") },
          { key: "order", label: t("a.order") },
          { key: "what", label: t("a.what") },
          { key: "level", label: t("a.status"), hideOnMobile: true },
        ]}
      />
    </>
  );
}
