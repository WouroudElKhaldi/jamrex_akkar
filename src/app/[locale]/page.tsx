import Link from "next/link";
import { VideoShowcase } from "@/components/store/video-showcase";
import { BeforeAfter } from "@/components/store/before-after";
import { Celebrities } from "@/components/store/celebrities";
import { memo } from "@/lib/memo";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Headphones, MapPin, ShieldCheck, Star, Truck, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { getSiteContent } from "@/lib/content";
import { getCategories, listProducts } from "@/lib/catalog";
import { getT } from "@/i18n";
import { imageUrl, isLocale, num, pick, alternatesFor, siteUrl } from "@/lib/utils";
import { safeLink, safeMapEmbed } from "@/lib/safe-url";
import { Hero } from "@/components/store/hero";
import { Section } from "@/components/store/section";
import { ProductCard } from "@/components/store/product-card";
import { CategoryTile } from "@/components/store/category-tile";
import { StatsStrip } from "@/components/store/stats-strip";
import { MarqueeStrip } from "@/components/store/marquee-strip";
import { DragCarousel } from "@/components/fx/drag-carousel";
import { TiltCard } from "@/components/fx/tilt-card";
import { Reveal, Stagger, StaggerItem } from "@/components/reveal";

export const dynamic = "force-dynamic";

/** video id from a youtube.com / youtu.be / embed link (or a bare id); "" when it is not one */
function youtubeId(raw: string): string {
  const m = raw.trim().match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/) ?? raw.trim().match(/^([\w-]{11})$/);
  return m ? m[1] : "";
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { alternates: alternatesFor(isLocale(locale) ? locale : "en", "") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const c = await getSiteContent();

  const [cats, deals, fresh, featured, banners, testimonials, productCount, zones] = await Promise.all([
    getCategories(locale),
    listProducts({ locale, onlyDeals: true, take: 12 }),
    listProducts({ locale, isNew: true, take: 12 }),
    listProducts({ locale, featured: true, take: 12 }),
    memo("banners", 60_000, () => db.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })),
    memo("testimonials", 60_000, () => db.testimonial.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } })),
    memo("productCount", 60_000, () => db.product.count({ where: { active: true } })),
    memo("zones", 60_000, () => db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })),
  ]);

  const floating = featured.items.concat(deals.items).flatMap((p) => p.images.slice(0, 1).map((i) => i.url)).slice(0, 4);
  const shownCats = cats.filter((x) => x.slug !== "other");
  const why = [
    { Icon: ShieldCheck, title: c.t("home.why1.title", locale), text: c.t("home.why1.text", locale) },
    { Icon: Truck, title: c.t("home.why2.title", locale), text: c.t("home.why2.text", locale) },
    { Icon: Wallet, title: c.t("home.why3.title", locale), text: c.t("home.why3.text", locale) },
    { Icon: Headphones, title: c.t("home.why4.title", locale), text: c.t("home.why4.text", locale) },
  ];
  const link = (raw: string) => {
    const href = safeLink(raw);
    return href.startsWith("/") ? `/${locale}${href}` : href || `/${locale}/shop`;
  };
  const carousel = (items: typeof fresh.items) => <DragCarousel>{items.map((p) => <ProductCard key={p.id} p={p} />)}</DragCarousel>;

  const base = siteUrl();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name: c.t("brand.name", locale),
      url: `${base}/${locale}`,
      image: c.v("brand.logo") ? new URL(imageUrl(c.v("brand.logo")), base).toString() : undefined,
      telephone: c.v("contact.phone"),
      email: c.v("contact.email"),
      address: { "@type": "PostalAddress", streetAddress: c.t("contact.address", locale), addressCountry: "LB" },
      openingHours: "Mo-Su 09:00-21:00",
      hasMap: c.v("contact.mapUrl") || undefined,
      priceRange: "$",
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: c.t("brand.name", locale), url: base, potentialAction: { "@type": "SearchAction", target: `${base}/${locale}/shop?q={q}`, "query-input": "required name=q" } },
  ];

  const videoId = c.on("home.show.video") ? youtubeId(c.v("home.video.url")) : "";
  const compare = c.on("home.show.ba")
    ? [1, 2, 3, 4]
        .map((i) => ({ title: c.t(`home.ba.${i}.title`, locale), before: c.v(`home.ba.${i}.before`), after: c.v(`home.ba.${i}.after`), href: c.v(`home.ba.${i}.link`) }))
        .filter((x) => x.before && x.after)
        .map((x) => ({ title: x.title, before: imageUrl(x.before), after: imageUrl(x.after), href: x.href ? link(x.href) : undefined }))
    : [];
  const celebImages = c.on("home.show.celebs") ? Array.from({ length: 16 }, (_, i) => c.v(`home.celebs.img${i + 1}`)).filter(Boolean).map((p) => imageUrl(p)) : [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {c.on("home.show.hero") && (
        <Hero
          badge={c.t("hero.badge", locale)}
          title={c.t("hero.title", locale)}
          subtitle={c.t("hero.subtitle", locale)}
          cta1={{ text: c.t("hero.cta1.text", locale), href: link(c.v("hero.cta1.link")) }}
          cta2={{ text: c.t("hero.cta2.text", locale), href: link(c.v("hero.cta2.link")) }}
          image={c.v("hero.image") ? imageUrl(c.v("hero.image")) : undefined}
          floating={floating}
          chips={why.map((w) => w.title)}
        />
      )}

      <MarqueeStrip words={shownCats.map((x) => x.name)} />

      {c.on("home.show.categories") && shownCats.length > 0 && (
        <Section title={c.t("home.categories.title", locale)} href="/shop" hrefLabel={t("common.viewAll")} locale={locale}>
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {shownCats.map((cat, i) => (
              <StaggerItem key={cat.slug}>
                <CategoryTile slug={cat.slug} name={cat.name} image={cat.image} count={cat.count} index={i} />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      )}

      {videoId && (
        <VideoShowcase
          videoId={videoId}
          poster={c.v("home.video.poster") ? imageUrl(c.v("home.video.poster")) : undefined}
          badge={c.t("home.video.badge", locale)}
          title={c.t("home.video.title", locale)}
          text={c.t("home.video.text", locale)}
          cta={c.t("home.video.cta.text", locale) ? { text: c.t("home.video.cta.text", locale), href: link(c.v("home.video.cta.link")) } : undefined}
        />
      )}

      {c.on("home.show.banners") && banners.length > 0 && (
        <section className="mx-auto max-w-[90rem] px-4 md:px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            {banners.map((b) => (
              <Reveal key={b.id}>
                <TiltCard max={5} className="rounded-3xl">
                  <Link href={b.link ? link(b.link) : `/${locale}/shop`} className="group relative flex min-h-52 items-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-[#3b6cf6] p-7 text-white shadow-glow">
                    {b.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(b.image)} alt="" className="absolute inset-y-0 end-0 h-full w-1/2 object-contain p-4 transition duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                    )}
                    <div className="relative max-w-[60%]">
                      <h3 className="text-2xl font-black leading-tight">{pick(locale, b.titleEn, b.titleAr)}</h3>
                      <p className="mt-2 text-sm text-white/85">{pick(locale, b.subtitleEn, b.subtitleAr)}</p>
                      {(b.ctaEn || b.ctaAr) && (
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand transition group-hover:gap-3">
                          {pick(locale, b.ctaEn, b.ctaAr)} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                        </span>
                      )}
                    </div>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {c.on("home.show.deals") && deals.items.length > 0 && (
        <Section title={c.t("home.deals.title", locale)} href="/offers" hrefLabel={t("common.viewAll")} locale={locale}>
          {carousel(deals.items)}
        </Section>
      )}

      {compare.length > 0 && <BeforeAfter title={c.t("home.ba.title", locale)} text={c.t("home.ba.text", locale)} items={compare} />}

      {c.on("home.show.stats") && <StatsStrip products={productCount} categories={shownCats.length} areas={zones.length} fee={zones.length ? num(zones[0].fee) : 4} />}

      {c.on("home.show.new") && fresh.items.length > 0 && (
        <Section title={c.t("home.new.title", locale)} href="/shop?sort=new" hrefLabel={t("common.viewAll")} locale={locale}>
          {carousel(fresh.items)}
        </Section>
      )}

      {c.on("home.show.featured") && featured.items.length > 0 && (
        <Section title={c.t("home.featured.title", locale)} href="/shop" hrefLabel={t("common.viewAll")} locale={locale}>
          {carousel(featured.items)}
        </Section>
      )}

      {celebImages.length > 0 && <Celebrities title={c.t("home.celebs.title", locale)} text={c.t("home.celebs.text", locale)} images={celebImages} />}

      {c.on("home.show.why") && (
        <section className="cv-auto mx-auto max-w-[90rem] px-4 md:px-6 py-10">
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {why.map(({ Icon, title, text }) => (
              <StaggerItem key={title}>
                <TiltCard max={10} className="h-full rounded-3xl">
                  <div className="group h-full rounded-3xl border border-border bg-surface p-6 shadow-card transition hover:shadow-glow">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-glow transition duration-300 group-hover:rotate-12 group-hover:scale-110">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-black">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {c.on("home.show.testimonials") && testimonials.length > 0 && (
        <Section title={c.t("home.testimonials.title", locale)}>
          <DragCarousel itemClass="w-[300px] sm:w-[360px]">
            {testimonials.map((x) => (
              <figure key={x.id} className="h-full rounded-3xl border border-border bg-surface p-6 shadow-card">
                <div className="mb-3 flex gap-0.5 text-warn">{Array.from({ length: x.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <blockquote className="leading-relaxed">“{pick(locale, x.textEn, x.textAr)}”</blockquote>
                <figcaption className="mt-4 text-sm font-bold text-brand">{pick(locale, x.nameEn, x.nameAr)}</figcaption>
              </figure>
            ))}
          </DragCarousel>
        </Section>
      )}

      {c.on("home.show.branch") && (
        <section className="cv-auto mx-auto max-w-[90rem] px-4 md:px-6 py-10">
          <Reveal>
            <div className="grid overflow-hidden rounded-3xl border border-border bg-surface shadow-card md:grid-cols-2">
              <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
                <h2 className="text-2xl font-black md:text-3xl">{c.t("home.branch.title", locale)}</h2>
                <p className="text-muted">{c.t("home.branch.text", locale)}</p>
                <ul className="space-y-2.5 text-sm font-semibold">
                  <li className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-accent" />{c.t("contact.address", locale)}</li>
                  <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-accent" />{c.t("contact.hours", locale)}</li>
                </ul>
                <div>
                  <a href={safeLink(c.v("contact.mapUrl")) || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
                    {t("contact.openMap")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </a>
                </div>
              </div>
              <iframe title="map" sandbox="allow-scripts allow-same-origin allow-popups" src={safeMapEmbed(c.v("contact.mapEmbed"))} loading="lazy" className="min-h-72 w-full border-0 md:h-full" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}
