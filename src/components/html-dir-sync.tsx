"use client";

import { useLayoutEffect } from "react";
import { useI18n } from "@/i18n/client";

/**
 * The root layout sets <html lang dir> on the server, but it is not re-rendered when the visitor
 * switches EN <-> AR with a client-side navigation. This keeps the attributes in step immediately.
 */
export function HtmlDirSync() {
  const { locale, dir } = useI18n();
  useLayoutEffect(() => {
    const el = document.documentElement;
    if (el.lang !== locale) el.lang = locale;
    if (el.dir !== dir) el.dir = dir;
  }, [locale, dir]);
  return null;
}
