import Link from "next/link";
import { User } from "lucide-react";
import { getSiteContent } from "@/lib/content";
import { getCategories } from "@/lib/catalog";
import { getCustomer } from "@/lib/auth";
import { getT } from "@/i18n";
import type { Locale } from "@/lib/utils";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { MobileMenu } from "./mobile-menu";
import { CartButton } from "./cart-drawer";
import { CategoryNav } from "./category-nav";
import { LangSwitch } from "@/components/lang-switch";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Header({ locale }: { locale: Locale }) {
  const [c, cats, customer] = await Promise.all([getSiteContent(), getCategories(locale), getCustomer()]);
  const t = getT(locale);
  const announce = c.on("announce.enabled") ? c.t("announce.text", locale) : "";
  const nav = cats.filter((x) => x.slug !== "other");
  const navCats = nav.map((x) => ({ slug: x.slug, name: x.name, image: x.image, count: x.count }));
  const navLabels = { categories: t("nav.categories"), all: t("nav.allProducts"), track: t("nav.track"), contact: t("nav.contact"), viewAll: t("common.viewAll") };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      {announce && (
        <div className="overflow-hidden bg-gradient-to-r from-brand to-[#2b62f0] py-1.5 text-xs font-semibold text-white">
          <div className="marquee-track flex w-max gap-16 whitespace-nowrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>🚚 {announce}</span>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4">
        <MobileMenu categories={nav.map((x) => ({ slug: x.slug, name: x.name }))} />
        <Logo locale={locale} logo={c.v("brand.logo")} logoDark={c.v("brand.logoDark")} name={c.t("brand.name", locale)} />
        <CategoryNav locale={locale} cats={navCats} labels={navLabels} />
        <div className="mx-2 hidden min-w-0 flex-1 lg:block">
          <SearchBox className="mx-auto max-w-xl" />
        </div>
        <div className="ms-auto flex items-center gap-1">
          <CategoryNav locale={locale} cats={navCats} labels={navLabels} side />
          <div className="hidden lg:block"><LangSwitch /></div>
          <div className="hidden lg:block"><ThemeToggle /></div>
          <Link href={`/${locale}/account`} aria-label={t("common.account")} className="inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold transition hover:bg-surface-2">
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">{customer ? customer.name.split(" ")[0] : t("common.login")}</span>
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
