import "server-only";
import { siteUrl } from "@/lib/utils";

/**
 * Defence in depth against cross-site request forgery for our JSON/upload routes:
 * browsers always send an Origin header on POST/DELETE, and it must be our own site.
 * (Cookies are also SameSite, and Server Actions have Next.js' own origin check.)
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const site = new URL(siteUrl());
    const host = req.headers.get("host");
    return o.origin === site.origin || (!!host && o.host === host);
  } catch {
    return false;
  }
}

/** Reject request bodies larger than `maxBytes` before reading them (Content-Length can lie, so parsing code must still limit). */
export function tooLarge(req: Request, maxBytes: number): boolean {
  const len = Number(req.headers.get("content-length") || 0);
  return Number.isFinite(len) && len > maxBytes;
}
