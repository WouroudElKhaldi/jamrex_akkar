import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getT } from "@/i18n";
import { formatDate, isLocale, orderCode } from "@/lib/utils";
import { TrackForm } from "@/components/store/forms";
import { MyOrders } from "@/components/store/my-orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track order", robots: { index: false } };

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const customer = await getCustomer();

  // signed in: all their orders are listed here (same rule as the account page: until the e-mail is confirmed, only orders made after sign-up)
  const orders = customer
    ? await db.order.findMany({
        where: { customerId: customer.id, ...(customer.emailVerifiedAt ? {} : { createdAt: { gte: customer.accountCreatedAt ?? new Date(0) } }) },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { _count: { select: { items: true } } },
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black">{t("order.track")}</h1>
        <p className="mt-2 text-muted">{orders ? t("order.trackText") : t("order.trackText")}</p>
      </div>
      {orders && (
        <MyOrders
          orders={orders.map((o) => ({ code: orderCode(o.number), href: `/${locale}/order/${orderCode(o.number)}?k=${o.accessKey}`, date: formatDate(o.createdAt, locale), status: o.status, total: Number(o.total), items: o._count.items }))}
        />
      )}
      {orders && <h2 className="mb-4 text-center text-lg font-bold text-muted">{t("order.trackAnother")}</h2>}
      <TrackForm />
    </div>
  );
}
