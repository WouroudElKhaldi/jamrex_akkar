import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getSiteContent } from "@/lib/content";
import { whishConfigured } from "@/lib/whish";
import { getT } from "@/i18n";
import { isLocale, num, pick } from "@/lib/utils";
import { CheckoutForm } from "@/components/store/checkout-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const [zones, customer, c] = await Promise.all([
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getCustomer(),
    getSiteContent(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl font-black tracking-tight">{t("checkout.title")}</h1>
      <CheckoutForm
        zones={zones.map((z) => ({ id: z.id, name: pick(locale, z.nameEn, z.nameAr), fee: num(z.fee), freeOver: z.freeOver ? num(z.freeOver) : null }))}
        prefill={{ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "", zoneId: customer?.zoneId ?? "" }}
        loggedIn={!!customer}
        codEnabled={c.on("payments.cod.enabled")}
        whishEnabled={c.on("payments.whish.enabled") && whishConfigured()}
        note={c.t("checkout.note", locale)}
      />
    </div>
  );
}
