import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

// Note: the secret dashboard path is intentionally NOT mentioned here (robots.txt is public).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/checkout", "/*/order/", "/*/account", "/*/track"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
