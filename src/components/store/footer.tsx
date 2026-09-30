import Link from "next/link";
import { memo } from "@/lib/memo";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getSiteContent } from "@/lib/content";
import { getCategories } from "@/lib/catalog";
import { getT } from "@/i18n";
import { imageUrl, pick, type Locale } from "@/lib/utils";
import { safeLink } from "@/lib/safe-url";
import { Logo } from "./logo";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.7V13h2.7v8h3.1z" /></svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M16.6 3c.3 2.1 1.5 3.4 3.4 3.6v3a6.6 6.6 0 0 1-3.4-1v5.7a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.1a2.6 2.6 0 1 0 1.7 2.4V3h3z" /></svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.8 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.3.1.7-.1 1.3z" /></svg>
);

export async function Footer({ locale }: { locale: Locale }) {
  const [c, cats, pages] = await Promise.all([
    getSiteContent(),
    getCategories(locale),
    memo("footerPages", 60_000, () => db.page.findMany({ where: { published: true, inFooter: true }, orderBy: { sortOrder: "asc" } })),
  ]);
  const t = getT(locale);
  const wa = c.v("contact.whatsapp").replace(/\D/g, "");
  const socials = [
    { href: safeLink(c.v("social.instagram")), icon: <InstagramIcon />, label: "Instagram" },
    { href: safeLink(c.v("social.facebook")), icon: <FacebookIcon />, label: "Facebook" },
    { href: safeLink(c.v("social.tiktok")), icon: <TikTokIcon />, label: "TikTok" },
    { href: wa ? `https://wa.me/${wa}` : "", icon: <WhatsAppIcon />, label: "WhatsApp" },
  ].filter((s) => s.href);
  const iso = c.v("brand.iso");

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo locale={locale} logo={c.v("brand.logo")} logoDark={c.v("brand.logoDark")} name={c.t("brand.name", locale)} />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{c.t("footer.about", locale)}</p>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted transition hover:bg-brand hover:text-brand-fg">
                {s.icon}
              </a>
            ))}
          </div>
          {iso && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(iso)} alt="ISO" className="h-14 w-auto" />
          )}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">{t("common.categories")}</h3>
          <ul className="space-y-2.5 text-sm text-muted">
            {cats.slice(0, 8).map((x) => (
              <li key={x.slug}><Link href={`/${locale}/category/${x.slug}`} className="transition hover:text-brand">{x.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">{t("common.help")}</h3>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href={`/${locale}/track`} className="transition hover:text-brand">{t("nav.track")}</Link></li>
            <li><Link href={`/${locale}/account`} className="transition hover:text-brand">{t("common.account")}</Link></li>
            <li><Link href={`/${locale}/contact`} className="transition hover:text-brand">{t("nav.contact")}</Link></li>
            {pages.map((p) => (
              <li key={p.id}><Link href={`/${locale}/p/${p.slug}`} className="transition hover:text-brand">{pick(locale, p.titleEn, p.titleAr)}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">{t("nav.contact")}</h3>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <a href={safeLink(c.v("contact.mapUrl")) || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-brand">{c.t("contact.address", locale)}</a></li>
            <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{c.t("contact.hours", locale)}</li>
            <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><a href={`tel:${c.v("contact.phone")}`} dir="ltr" className="hover:text-brand">{c.v("contact.phone")}</a></li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><a href={`mailto:${c.v("contact.email")}`} className="hover:text-brand">{c.v("contact.email")}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {c.t("footer.copyright", locale)}
      </div>
    </footer>
  );
}
