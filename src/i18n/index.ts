import en, { type Dict } from "./en";
import ar from "./ar";
import type { Locale } from "@/lib/utils";

export type { Dict };

export function getDict(locale: Locale): Dict {
  return locale === "ar" ? ar : en;
}

/** The storefront's dictionary without the dashboard section ("a"): visitors have no business seeing staff-interface text. */
export function getPublicDict(locale: Locale): Dict {
  const full = getDict(locale);
  return { ...full, a: {} as Dict["a"] };
}

/** Look up "a.b.c" in the dictionary and replace {vars}. Falls back to the key itself. */
export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof cur !== "string") return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function getT(locale: Locale) {
  const dict = getDict(locale);
  return (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars);
}
