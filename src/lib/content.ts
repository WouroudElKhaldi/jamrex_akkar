import { cache } from "react";
import { db } from "@/lib/db";
import { memo } from "@/lib/memo";
import { FIELD_BY_KEY } from "@/lib/content-registry";
import type { Locale } from "@/lib/utils";

export type SiteContent = {
  /** Text for a key in the requested language (falls back to EN, then to the registry default). */
  t: (key: string, locale: Locale) => string;
  /** Language-independent value (phone, URLs, toggles, images). */
  v: (key: string) => string;
  on: (key: string) => boolean;
};

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const rows = await memo("content", 60_000, () => db.content.findMany());
  const map = new Map(rows.map((r) => [r.key, r]));

  const t = (key: string, locale: Locale) => {
    const def = FIELD_BY_KEY[key]?.def;
    const row = map.get(key);
    if (locale === "ar") return (row?.ar || "").trim() || (row ? row.en : "") || def?.ar || def?.en || "";
    return row ? row.en : def?.en ?? "";
  };
  const v = (key: string) => {
    const row = map.get(key);
    return row ? row.en : FIELD_BY_KEY[key]?.def.en ?? "";
  };
  return { t, v, on: (key) => v(key) === "1" };
});
