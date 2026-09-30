import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Listing, type ListingParams } from "@/components/store/listing";
import { getT } from "@/i18n";
import { alternatesFor, isLocale } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getT(locale)("shop.title") : "Shop", alternates: isLocale(locale) ? alternatesFor(locale, "/shop") : undefined };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<ListingParams> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  return <Listing locale={locale} title={getT(locale)("shop.title")} params={sp} />;
}
