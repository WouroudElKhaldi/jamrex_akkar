import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getSiteContent } from "@/lib/content";
import { reconcileOrderPayment, whishConfigured } from "@/lib/whish";
import { getT } from "@/i18n";
import { formatDate, imageUrl, isLocale, money, num, orderCode, parseOrderCode, pick } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import { PayNowButton } from "@/components/store/pay-now";
import { ReorderButton } from "@/components/store/reorder-button";
import { ClearCartOnMount } from "@/components/store/clear-cart";
import { ORDER_STATUSES } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; code: string }>; searchParams: Promise<{ k?: string; new?: string; paid?: string; failed?: string }> }) {
  const { locale, code } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    notFound(); // malformed %-escape
  }
  const n = parseOrderCode(decoded);
  if (!n) notFound();

  let order = await db.order.findUnique({ where: { number: n }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } });
  const customer = await getCustomer();
  const allowed = !!order && ((sp.k && sp.k === order.accessKey) || (customer && order.customerId === customer.id && (!!customer.emailVerifiedAt || order.createdAt >= (customer.accountCreatedAt ?? new Date(0)))));
  if (!order || !allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="mb-4 text-muted">{t("order.notFound")}</p>
        <Link href={`/${locale}/track`} className="font-bold text-brand hover:underline">{t("order.track")}</Link>
      </div>
    );
  }

  // Returning from Whish? Never trust the redirect: ask Whish for the real status.
  if (order.paymentMethod === "WHISH" && order.paymentStatus !== "PAID" && whishConfigured()) {
    await reconcileOrderPayment(order.id).catch(() => {});
    order = (await db.order.findUnique({ where: { number: n }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } }))!;
  }

  const c = await getSiteContent();
  const cancelled = order.status === "CANCELLED";
  const flow = ORDER_STATUSES.filter((s) => s !== "CANCELLED");
  const idx = flow.indexOf(order.status as (typeof flow)[number]);
  const unpaidWhish = order.paymentMethod === "WHISH" && order.paymentStatus !== "PAID" && !cancelled;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      {((sp.new === "1" && order.paymentMethod === "COD") || sp.paid === "1") && <ClearCartOnMount />}

      <div className="mb-8 text-center">
        {sp.new === "1" || sp.paid === "1" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok"><CheckCircle2 className="h-9 w-9" /></div>
            <h1 className="text-3xl font-black">{t("order.thanks")}</h1>
            <p className="mt-2 text-muted">{t("order.weWillCall")}</p>
          </>
        ) : (
          <h1 className="text-3xl font-black">{t("order.track")}</h1>
        )}
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-bold text-brand" dir="ltr">{orderCode(order.number)}</p>
      </div>

      {sp.failed === "1" && <p className="mb-6 rounded-xl bg-danger/10 p-4 text-center text-sm font-semibold text-danger">{t("order.whishFailed")}</p>}

      {/* progress */}
      <Card className="mb-6 p-6">
        {cancelled ? (
          <div className="flex items-center gap-3 font-bold text-danger"><XCircle className="h-6 w-6" /> {t("order.statusCANCELLED")}</div>
        ) : (
          <ol className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {flow.filter((s) => s !== "CONFIRMED").map((s) => {
              const si = flow.indexOf(s);
              const done = si <= idx;
              return (
                <li key={s} className={done ? "text-brand" : "text-muted"}>
                  <div className="mb-2 flex justify-center">{done ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}</div>
                  {t(`order.status${s}`)}
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-4 text-sm">
          <Badge tone={order.paymentStatus === "PAID" ? "ok" : order.paymentStatus === "FAILED" ? "danger" : "warn"}>{t(`order.pay${order.paymentStatus}`)}</Badge>
          <span className="text-muted">{t(`order.method${order.paymentMethod}`)}</span>
        </div>
        {unpaidWhish && (
          <div className="mt-4 text-center">
            <p className="mb-3 flex items-center justify-center gap-2 text-sm text-muted"><Clock className="h-4 w-4" /> {t("order.paymentPending")}</p>
            <PayNowButton orderId={order.id} k={order.accessKey} />
          </div>
        )}
      </Card>

      <Card className="mb-6 divide-y divide-border">
        {order.items.map((i) => (
          <div key={i.id} className="flex gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(i.image)} alt="" className="h-16 w-16 rounded-xl border border-border bg-white object-contain p-1" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{pick(locale, i.nameEn, i.nameAr)}</p>
              <p className="text-sm text-muted">{[pick(locale, i.sizeLabelEn, i.sizeLabelAr), pick(locale, i.optionLabelEn, i.optionLabelAr)].filter(Boolean).join(" · ")} × {i.qty}</p>
            </div>
            <span className="font-bold">{money(num(i.unitPrice) * i.qty)}</span>
          </div>
        ))}
        <dl className="space-y-1.5 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t("common.subtotal")}</dt><dd>{money(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t("common.delivery")}</dt><dd>{num(order.deliveryFee) === 0 ? t("common.free") : money(order.deliveryFee)}</dd></div>
          <div className="flex justify-between text-lg font-black"><dt>{t("common.total")}</dt><dd className="text-brand">{money(order.total)}</dd></div>
        </dl>
      </Card>

      <div className="mb-6"><ReorderButton code={orderCode(order.number)} k={sp.k} /></div>

      <Card className="grid gap-4 p-6 text-sm sm:grid-cols-2">
        <div><p className="text-muted">{t("order.customer")}</p><p className="font-semibold">{order.name}</p><p dir="ltr" className="text-start text-muted">{order.phone}</p></div>
        <div><p className="text-muted">{t("order.address")}</p><p className="font-semibold">{pick(locale, order.zoneName, order.zoneName)}</p><p className="text-muted">{order.address}</p></div>
        <div><p className="text-muted">{t("order.placedOn")}</p><p className="font-semibold">{formatDate(order.createdAt, locale)}</p></div>
        <div><p className="text-muted">{t("nav.contact")}</p><a dir="ltr" href={`tel:${c.v("contact.phone")}`} className="font-semibold text-brand">{c.v("contact.phone")}</a></div>
      </Card>
    </div>
  );
}
