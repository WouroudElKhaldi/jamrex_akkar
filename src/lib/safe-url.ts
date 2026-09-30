// URL sanitising for anything staff can type into the dashboard and we later put in an href / src / iframe.
// A "javascript:" or "data:" link in a banner or button would otherwise run script when a visitor clicks it.

/** Allowed: site-relative paths (/shop), https:// and http:// links. Anything else -> "" */
export function safeLink(input: string | null | undefined): string {
  const v = (input ?? "").trim();
  if (!v) return "";
  if (/[\u0000-\u001f\u007f\s]/.test(v)) return ""; // control chars / whitespace tricks like "java\tscript:"
  if (v.startsWith("/")) return v.startsWith("//") || v.startsWith("/\\") ? "" : v; // "//evil.com" is protocol-relative
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Maps embed: only Google Maps over https. Anything else -> "" (an iframe to an arbitrary site could phish visitors). */
export function safeMapEmbed(input: string | null | undefined): string {
  const v = safeLink(input);
  if (!v) return "";
  try {
    const u = new URL(v);
    const ok = u.protocol === "https:" && ((u.hostname === "www.google.com" && u.pathname.startsWith("/maps")) || (u.hostname === "maps.google.com" && u.pathname.startsWith("/maps")));
    return ok ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Uploaded image path (2026/09/abc.webp) or an https image URL. Anything else -> "" */
export function safeImagePath(input: string | null | undefined): string {
  const v = (input ?? "").trim();
  if (!v) return "";
  if (/^[A-Za-z0-9_\-./]+$/.test(v) && !v.includes("..") && !v.startsWith("/")) return v;
  return v.startsWith("https://") ? safeLink(v) : "";
}
