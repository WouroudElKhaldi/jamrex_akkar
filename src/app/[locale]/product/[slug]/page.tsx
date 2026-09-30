import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getProduct, listProducts } from "@/lib/catalog";
import { getSiteContent } from "@/lib/content";
import { getT } from "@/i18n";
import { isLocale } from "@/lib/utils";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductGrid } from "@/components/store/product-card";
import { Section } from "@/components/store/section";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await getProduct(slug, locale);
  if (!p) return {};
  return {
    title: p.name,
    description: p.short || p.desc.slice(0, 160),
    openGraph: { title: p.name, description: p.short, images: p.images[0] ? [p.images[0].url] : undefined },
    alternates: { languages: { en: `/en/product/${slug}`, ar: `/ar/product/${slug}` } },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [p, c] = await Promise.all([getProduct(slug, locale), getSiteContent()]);
  if (!p) notFound();
  const t = getT(locale);

  const raw = await db.product.findUnique({ where: { slug }, select: { nameAr: true, nameEn: true } });
  const related = p.categories[0] ? (await listProducts({ locale, category: p.categories[0].slug, excludeId: p.id, take: 4 })).items : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => i.url),
    description: p.short || p.desc,
    offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: p.minPrice, highPrice: p.maxPrice, availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div className="mx-auto max-w-[90rem] px-4 md:px-6 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "") }} />
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="breadcrumb">
        <Link href={`/${locale}`} className="hover:text-brand">{t("common.home")}</Link>
        <span>/</span>
        {p.categories[0] && (
          <>
            <Link href={`/${locale}/category/${p.categories[0].slug}`} className="hover:text-brand">{p.categories[0].name}</Link>
            <span>/</span>
          </>
        )}
        <span className="font-semibold text-fg">{p.name}</span>
      </nav>

      <ProductDetail p={p} whatsapp={c.v("contact.whatsapp").replace(/\D/g, "")} arName={raw?.nameAr || raw?.nameEn || p.name} />

      {related.length > 0 && (
        <Section title={t("product.related")} className="!px-0">
          <ProductGrid products={related} />
        </Section>
      )}
    </div>
  );
}
