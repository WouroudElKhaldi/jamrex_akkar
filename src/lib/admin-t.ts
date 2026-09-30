import "server-only";
import { headers } from "next/headers";
import { getT } from "@/i18n";
import type { Locale } from "@/lib/utils";

/** Translator for server-rendered dashboard pages (language comes from the admin_lang cookie via middleware). */
export async function adminT() {
  const locale: Locale = (await headers()).get("x-locale") === "ar" ? "ar" : "en";
  return { t: getT(locale), locale };
}
