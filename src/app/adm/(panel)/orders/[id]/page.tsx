import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { adminBase, can, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate, imageUrl, money, num, orderCode, pick } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/permissions";
import { addOrderNote, clearOrderFlag, markOrderPaid, refundOrder, updateOrderStatus } from "@/actions/admin/orders";
import { OrderStatusBadge, PAY_TONE } from "@/components/admin/bits";
import { PrintButton } from "@/components/admin/print-button";
import { AutoRefresh } from "@/components/admin/shell";
import { Badge, Button, Card, Input } from "@/components/ui";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("orders.view");
  const { id } = await params;
  const { t, locale } = await adminT();
  const base = adminBase();
  const o = await db.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, hidden: true } } } } } });
  if (!o) notFound();

  const canUpdate = can(user, "orders.update");
  const canCancel = can(user, "orders.cancel");
  const waPhone = o.phone.replace(/\D/g, "");
  const isFinal = o.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-5xl">
      <AutoRefresh seconds={30} />
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`${base}/orders`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"><ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("a.orders")}</Link>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener"><Button variant="outline" size="sm"><MessageCircle className="h-4 w-4" /> {t("a.whatsappCustomer")}</Button></a>
          <a href={`tel:${o.phone}`}><Button variant="outline" size="sm"><Phone className="h-4 w-4" /> {t("a.callCustomer")}</Button></a>
          <PrintButton label={t("a.printInvoice")} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black" dir="ltr">{orderCode(o.number)}</h1>
        <OrderStatusBadge status={o.status} label={t(`order.status${o.status}`)} />
        <Badge tone={PAY_TONE[o.paymentStatus]}>{t(`order.pay${o.paymentStatus}`)}</Badge>
        <span className="text-sm text-muted">{formatDate(o.createdAt, locale)}</span>
      </div>

      {o.flag && (
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warn/15 p-4 text-sm font-semibold text-warn">
          <span>⚠ {t("a.flagged")}: {o.flag}</span>
          {canUpdate && <form action={clearOrderFlag}><input type="hidden" name="id" value={o.id} /><Button size="sm" variant="outline" type="submit">OK</Button></form>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="divide-y divide-border">
            {o.items.map((i) => (
              <div key={i.id} className="flex gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(i.image)} alt="" className="h-16 w-16 rounded-xl border border-border bg-white object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pick(locale, i.nameEn, i.nameAr)}</p>
                  <p className="text-sm text-muted">{[pick(locale, i.sizeLabelEn, i.sizeLabelAr), pick(locale, i.optionLabelEn, i.optionLabelAr)].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm text-muted">{money(i.unitPrice)} × {i.qty}</p>
                </div>
                <span className="font-bold">{money(num(i.unitPrice) * i.qty)}</span>
              </div>
            ))}
            <dl className="space-y-1.5 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{t("a.subtotal")}</dt><dd>{money(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t("a.deliveryFee")} ({o.zoneName})</dt><dd>{money(o.deliveryFee)}</dd></div>
              <div className="flex justify-between text-lg font-black"><dt>{t("a.total")}</dt><dd className="text-brand">{money(o.total)}</dd></div>
            </dl>
          </Card>

          <Card className="grid gap-5 p-5 text-sm sm:grid-cols-2">
            <div><p className="text-muted">{t("a.customer")}</p><p className="font-bold">{o.name}</p><p dir="ltr" className="text-start">{o.phone}</p><p dir="ltr" className="text-start text-muted">{o.email}</p></div>
            <div><p className="text-muted">{t("a.address")}</p><p className="font-bold">{o.zoneName}</p><p>{o.address}</p></div>
            <div><p className="text-muted">{t("a.payment")}</p><p className="font-bold">{o.paymentMethod === "WHISH" ? "Whish Pay" : t("order.methodCOD")}</p>{o.whishExternalId && <p className="text-xs text-muted" dir="ltr">{o.whishExternalId}</p>}</div>
            {o.notes && <div><p className="text-muted">{t("a.notes")}</p><p className="whitespace-pre-line">{o.notes}</p></div>}
          </Card>
        </div>

        <div className="no-print space-y-6">
          {canUpdate && !isFinal && (
            <Card className="space-y-3 p-5">
              <h2 className="font-bold">{t("a.changeStatus")}</h2>
              <div className="grid gap-2">
                {ORDER_STATUSES.filter((s) => s !== o.status && (s !== "CANCELLED" || canCancel)).map((s) => (
                  <form key={s} action={updateOrderStatus}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="status" value={s} />
                    <Button type="submit" variant={s === "CANCELLED" ? "danger" : s === o.status ? "primary" : "outline"} size="sm" className="w-full justify-start">
                      {s === "CANCELLED" ? t("a.cancelOrder") : t(`order.status${s}`)}
                    </Button>
                  </form>
                ))}
              </div>
              {o.paymentMethod === "COD" && o.paymentStatus !== "PAID" && (
                <form action={markOrderPaid}><input type="hidden" name="id" value={o.id} /><Button type="submit" variant="soft" size="sm" className="w-full">{t("a.markPaid")}</Button></form>
              )}
            </Card>
          )}

          {can(user, "orders.refund") && o.paymentMethod === "WHISH" && o.paymentStatus === "PAID" && (
            <Card className="space-y-2 p-5">
              <form action={refundOrder} className="space-y-2">
                <input type="hidden" name="id" value={o.id} />
                <Input name="reason" placeholder={t("a.reason")} />
                <Button type="submit" variant="danger" size="sm" className="w-full">{t("a.refund")}</Button>
              </form>
            </Card>
          )}

          <Card className="space-y-3 p-5">
            <h2 className="font-bold">{t("a.timeline")}</h2>
            {canUpdate && (
              <form action={addOrderNote} className="flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <Input name="note" placeholder={t("a.notes")} className="h-9" />
                <Button type="submit" size="sm" variant="outline">{t("a.add")}</Button>
              </form>
            )}
            <ol className="space-y-3 border-s border-border ps-4 text-sm">
              {o.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                  <p className="font-semibold">{e.status ? t(`order.status${e.status}`) : "•"} {e.note && <span className="font-normal text-muted">{e.note}</span>}</p>
                  <p className="text-xs text-muted">{formatDate(e.createdAt, locale)}{e.user && !e.user.hidden ? ` · ${e.user.name}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
