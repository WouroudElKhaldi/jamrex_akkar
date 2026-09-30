import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Locale = "en" | "ar";
export const LOCALES: Locale[] = ["en", "ar"];
export const isLocale = (v: string | undefined | null): v is Locale => v === "en" || v === "ar";

/** Prisma Decimal | string | number -> number */
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(String(v));
}

export function money(v: unknown): string {
  const n = num(v);
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Pick the AR text when locale is Arabic and it exists, otherwise fall back to EN. */
export function pick(locale: Locale, en: string | null | undefined, ar: string | null | undefined): string {
  if (locale === "ar" && ar && ar.trim()) return ar;
  return en ?? "";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

/** Normalise to E.164. Lebanese local numbers (03/70/71/76/78/79/81 ...) get +961. */
export function normalizePhone(raw: string): string {
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) return s;
  if (s.startsWith("961")) return "+" + s;
  if (s.startsWith("0")) s = s.slice(1);
  return "+961" + s;
}

export function isValidPhone(e164: string): boolean {
  return /^\+\d{8,15}$/.test(e164);
}

export function imageUrl(path: string | null | undefined, size?: "sm"): string {
  if (!path) return "/brand/placeholder.svg";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  if (size === "sm" && path.endsWith(".webp")) return "/uploads/" + path.slice(0, -5) + "-sm.webp";
  return "/uploads/" + path;
}

export function formatDate(d: Date | string, locale: Locale = "en"): string {
  return new Date(d).toLocaleString(locale === "ar" ? "ar-LB-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function orderCode(n: number): string {
  return "JM-" + String(n).padStart(5, "0");
}

/** canonical + hreflang links for a page path such as "/shop" (use "" for the home page) */
export function alternatesFor(locale: string, path: string) {
  return { canonical: `/${locale}${path}`, languages: { en: `/en${path}`, ar: `/ar${path}`, "x-default": `/en${path}` } };
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** "JM-00012" / "jm12" / "12" -> 12. Anything else (letters, symbols, huge numbers) -> null, so it can never reach the database. */
export function parseOrderCode(input: string): number | null {
  const m = /^(?:jm-?)?(\d{1,9})$/i.exec(input.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n <= 2_000_000_000 ? n : null;
}
