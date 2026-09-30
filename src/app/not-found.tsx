import Link from "next/link";
import { headers } from "next/headers";
import { getT } from "@/i18n";

export default async function NotFound() {
  const h = await headers();
  const locale = h.get("x-locale") === "ar" ? "ar" : "en";
  const t = getT(locale);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="bg-gradient-to-r from-brand to-accent bg-clip-text text-8xl font-black text-transparent">404</p>
      <h1 className="text-2xl font-black">{t("common.notFound")}</h1>
      <p className="text-muted">{t("common.notFoundText")}</p>
      <Link href={`/${locale}`} className="rounded-xl bg-brand px-6 py-3 font-semibold text-brand-fg shadow-card hover:bg-brand-hover">
        {t("common.goHome")}
      </Link>
    </div>
  );
}
