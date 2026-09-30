import Link from "next/link";
import { headers } from "next/headers";
import { adminBase } from "@/lib/auth";
import { getT } from "@/i18n";

export default async function ForbiddenPage() {
  const t = getT((await headers()).get("x-locale") === "ar" ? "ar" : "en");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-black">{t("a.forbiddenTitle")}</h1>
      <p className="text-muted">{t("a.forbidden")}</p>
      <Link href={adminBase()} className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-brand-fg">{t("a.back")}</Link>
    </div>
  );
}
