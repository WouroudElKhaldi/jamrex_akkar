import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicDict } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { CartProvider } from "@/components/cart-provider";
import { CartDrawer } from "@/components/store/cart-drawer";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { WhatsAppFloat } from "@/components/store/whatsapp-float";
import { getSiteContent } from "@/lib/content";
import { db } from "@/lib/db";
import { memo } from "@/lib/memo";
import { HtmlDirSync } from "@/components/html-dir-sync";
import { ScrollProgress } from "@/components/fx/scroll-progress";
import { CursorGlow } from "@/components/fx/cursor-glow";
import { isLocale } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = await getSiteContent();
  return {
    title: { default: c.t("seo.title", locale), template: `%s · ${c.t("brand.name", locale)}` },
    description: c.t("seo.description", locale),
    openGraph: { title: c.t("seo.title", locale), description: c.t("seo.description", locale), locale: locale === "ar" ? "ar_LB" : "en_US", type: "website" },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = await getSiteContent();
  // "free delivery over $X" hint in the cart: the lowest threshold any active zone offers
  const zones = await memo("zones", 60_000, () => db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }));
  const thresholds = zones.map((z) => (z.freeOver ? Number(z.freeOver) : 0)).filter((n) => n > 0);
  const freeOver = thresholds.length ? Math.min(...thresholds) : null;

  return (
    <I18nProvider locale={locale} dict={getPublicDict(locale)}>
      <CartProvider>
        <HtmlDirSync />
        <a href="#main" className="sr-only z-[100] rounded-xl bg-brand px-4 py-2 font-bold text-brand-fg focus:not-sr-only focus:fixed focus:start-3 focus:top-3">{locale === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}</a>
        <ScrollProgress />
        <CursorGlow />
        <Header locale={locale} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
        <CartDrawer freeOver={freeOver} />
        <WhatsAppFloat number={c.v("contact.whatsapp")} />
      </CartProvider>
    </I18nProvider>
  );
}
