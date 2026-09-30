import { NextResponse, type NextRequest } from "next/server";

// Node.js runtime so ADMIN_PATH is read at runtime (not baked in at build time).
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/|api/|uploads/|brand/|favicon|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};

const LOCALES = ["en", "ar"];
const isProd = process.env.NODE_ENV === "production";

// ───────── Content-Security-Policy (per-request nonce) ─────────
// Only scripts that carry this request's nonce may run, so an injected <script> or inline handler is dead on arrival.
function csp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
    "frame-src https://www.google.com https://maps.google.com https://www.youtube-nocookie.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// ───────── simple per-address rate limit for pages and Server Actions ─────────
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string, method: string): boolean {
  const post = method !== "GET" && method !== "HEAD";
  const key = ip + (post ? ":w" : ":r");
  const max = post ? 150 : 900; // per minute (several staff can share one shop Wi-Fi address)
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    hits.set(key, { n: 1, reset: now + 60_000 });
    return false;
  }
  h.n += 1;
  return h.n > max;
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function nonceValue(): string {
  return btoa(crypto.randomUUID());
}

function secure(res: NextResponse, policy: string) {
  res.headers.set("Content-Security-Policy", policy);
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const admin = (process.env.ADMIN_PATH || "").replace(/^\/|\/$/g, "");

  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "POST") {
    return new NextResponse("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD, POST", "Cache-Control": "no-store" } });
  }
  if (limited(clientIp(req), req.method)) {
    return new NextResponse("Too many requests. Please slow down.", { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  }

  const nonce = nonceValue();
  const policy = csp(nonce);
  const baseHeaders = new Headers(req.headers);
  baseHeaders.set("x-nonce", nonce);
  baseHeaders.set("Content-Security-Policy", policy); // Next.js reads the nonce from here and stamps its own scripts

  // 1) Secret dashboard URL -> internal /adm routes
  if (admin && (pathname === `/${admin}` || pathname.startsWith(`/${admin}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = "/adm" + pathname.slice(admin.length + 1);
    baseHeaders.set("x-locale", req.cookies.get("admin_lang")?.value === "ar" ? "ar" : "en");
    baseHeaders.set("x-admin", "1");
    const res = NextResponse.rewrite(url, { request: { headers: baseHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    res.headers.set("Cache-Control", "no-store");
    return secure(res, policy);
  }

  // 2) The internal path itself (and the obvious guesses) must not exist for outsiders
  const seg = pathname.split("/")[1];
  if (seg === "adm" || seg === "admin" || seg === "dashboard" || seg === "wp-admin" || seg === "wp-login.php" || seg === "administrator" || seg === "login" || seg === "staff" || seg === "manage" || seg === "backend") {
    return secure(NextResponse.rewrite(new URL("/__not_found__", req.url), { status: 404 }), policy);
  }

  // 3) Storefront locale routing
  if (LOCALES.includes(seg)) {
    baseHeaders.set("x-locale", seg);
    const res = NextResponse.next({ request: { headers: baseHeaders } });
    res.cookies.set("locale", seg, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: isProd });
    return secure(res, policy);
  }

  const cookieLocale = req.cookies.get("locale")?.value;
  const accept = req.headers.get("accept-language") || "";
  const locale = cookieLocale === "ar" || cookieLocale === "en" ? cookieLocale : accept.toLowerCase().startsWith("ar") ? "ar" : "en";
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}
