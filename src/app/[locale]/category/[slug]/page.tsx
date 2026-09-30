import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { memo } from "@/lib/memo";
import { Listing, type ListingParams } from "@/components/store/listing";
import { alternatesFor, isLocale, pick } from "@/lib/utils";

export const dynamic = "force-dynamic";

// one cached list of visible categories, looked up by slug (a cache entry per requested slug would let anyone grow it)
const load = cache(async (slug: string) => (await memo("categoryRows", 60_000, () => db.category.findMany({ where: { visible: true } }))).find((c) => c.slug === slug) ?? null);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = await load(slug);
  if (!cat || !isLocale(locale)) return {};
  return { title: pick(locale, cat.nameEn, cat.nameAr), description: pick(locale, cat.descEn, cat.descAr) || undefined, alternates: alternatesFor(locale, `/category/${slug}`) };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<ListingParams> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const cat = await load(slug);
  if (!cat) notFound();
  const sp = await searchParams;
  return <Listing locale={locale} category={slug} title={pick(locale, cat.nameEn, cat.nameAr)} subtitle={pick(locale, cat.descEn, cat.descAr)} params={sp} />;
}
