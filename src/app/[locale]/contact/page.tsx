import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSiteContent } from "@/lib/content";
import { getT } from "@/i18n";
import { isLocale, alternatesFor } from "@/lib/utils";
import { safeLink, safeMapEmbed } from "@/lib/safe-url";
import { Card } from "@/components/ui";
import { ContactForm } from "@/components/store/forms";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: "Contact", alternates: alternatesFor(locale, "/contact") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const c = await getSiteContent();
  const wa = c.v("contact.whatsapp").replace(/\D/g, "");

  const rows = [
    { Icon: MapPin, label: t("contact.visit"), value: c.t("contact.address", locale), href: safeLink(c.v("contact.mapUrl")) || undefined },
    { Icon: Clock, label: t("contact.hours"), value: c.t("contact.hours", locale) },
    { Icon: Phone, label: t("contact.callWhatsapp"), value: c.v("contact.phone"), href: `tel:${c.v("contact.phone")}`, ltr: true },
    { Icon: Mail, label: t("contact.emailUs"), value: c.v("contact.email"), href: `mailto:${c.v("contact.email")}`, ltr: true },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">{t("contact.title")}</h1>
      <p className="mt-2 max-w-xl text-muted">{t("contact.text")}</p>
      <div className="mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {rows.map(({ Icon, label, value, href, ltr }) => (
            <Card key={label} className="flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
              <div>
                <p className="text-sm text-muted">{label}</p>
                {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" dir={ltr ? "ltr" : undefined} className="font-bold hover:text-brand">{value}</a> : <p className="font-bold">{value}</p>}
              </div>
            </Card>
          ))}
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-xl bg-[#25d366] py-3.5 font-bold text-white shadow-card transition hover:opacity-90">{t("common.whatsapp")}</a>}
          <iframe title="map" sandbox="allow-scripts allow-same-origin allow-popups" src={safeMapEmbed(c.v("contact.mapEmbed"))} loading="lazy" className="h-64 w-full rounded-2xl border border-border" />
        </div>
        <Card className="h-fit p-7">
          <h2 className="mb-5 text-xl font-bold">{t("contact.formTitle")}</h2>
          <ContactForm />
        </Card>
      </div>
    </div>
  );
}
