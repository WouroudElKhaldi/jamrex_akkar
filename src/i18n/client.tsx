"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { translate, type Dict } from "./index";
import type { Locale } from "@/lib/utils";

type Ctx = { locale: Locale; dict: Dict };
const I18nContext = createContext<Ctx>({ locale: "en", dict: {} as Dict });

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const { locale, dict } = useContext(I18nContext);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(dict, key, vars), [dict]);
  return { t, locale, dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const) };
}
