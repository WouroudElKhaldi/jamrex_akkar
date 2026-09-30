import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/catalog";
import { loadActiveOffers, offerBadge } from "@/lib/offers";
import { getT } from "@/i18n";
import { imageUrl, isLocale, pick } from "@/lib/utils";
import { ProductGrid } from "@/components/store/product-card";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Offers" };

export default async function OffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);

  const offers = await loadActiveOffers();
  const rows = await db.offer.findMany({ where: { id: { in: offers.map((o) => o.id) } }, select: { id: true, descEn: true, descAr: true, image: true } });
  const extra = new Map(rows.map((r) => [r.id, r]));

  const groups = await Promise.all(offers.map(async (o) => ({ o, items: (await listProducts({ locale, offerId: o.id, take: 48 })).items })));
  const bundles = (await listProducts({ locale, category: "offers", take: 48 })).items;
  const shownIds = new Set(groups.flatMap((g) => g.items.map((p) => p.id)));
  const bundleOnly = bundles.filter((p) => !shownIds.has(p.id));
  const empty = groups.every((g) => g.items.length === 0) && bundleOnly.length === 0;

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ar" ? "ar-LB-u-nu-latn" : "en-GB", { day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-[90rem] px-4 md:px-6 py-10 md:py-14">
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">{t("offers.title")}</h1>
      <p className="mt-2 text-muted">{t("offers.subtitle")}</p>
      <div className="mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />

      {empty && <p className="mt-10 rounded-2xl border border-dashed border-border py-16 text-center text-muted">{t("offers.none")}</p>}

      <div className="mt-10 space-y-14">
        {groups.filter((g) => g.items.length > 0).map(({ o, items }) => {
          const x = extra.get(o.id);
          const desc = x ? pick(locale, x.descEn, x.descAr) : "";
          return (
            <section key={o.id}>
              <Reveal>
                <div className="relative mb-6 flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-[#3b6cf6] p-6 text-white shadow-glow md:p-8">
                  {x?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(x.image)} alt="" className="absolute inset-y-0 end-0 h-full w-1/3 object-contain p-3 opacity-90" />
                  )}
                  <span className="relative rounded-2xl bg-danger px-4 py-2 text-3xl font-black">{offerBadge(o)}</span>
                  <div className="relative max-w-2xl">
                    <h2 className="text-2xl font-black">{pick(locale, o.nameEn, o.nameAr)}</h2>
                    {desc && <p className="mt-1 text-white/85">{desc}</p>}
                    <p className="mt-2 text-sm font-semibold text-white/80">{o.endsAt ? t("offers.endsOn", { date: fmt(o.endsAt) }) : t("offers.noEnd")}</p>
                  </div>
                </div>
              </Reveal>
              <ProductGrid products={items} />
            </section>
          );
        })}

        {bundleOnly.length > 0 && (
          <section>
            <h2 className="mb-6 text-2xl font-black">{t("offers.bundles")}</h2>
            <ProductGrid products={bundleOnly} />
          </section>
        )}
      </div>
    </div>
  );
}
