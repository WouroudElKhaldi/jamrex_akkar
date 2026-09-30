import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, cats, pages] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { visible: true }, select: { slug: true } }),
    db.page.findMany({ where: { published: true }, select: { slug: true } }),
  ]);
  const both = (path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}) =>
    ["en", "ar"].map((l) => ({ url: `${base}/${l}${path}`, alternates: { languages: { en: `${base}/en${path}`, ar: `${base}/ar${path}` } }, ...extra }));
  return [
    ...both("", { priority: 1 }),
    ...both("/shop", { priority: 0.9 }),
    ...both("/contact"),
    ...cats.flatMap((c) => both(`/category/${c.slug}`, { priority: 0.8 })),
    ...products.flatMap((p) => both(`/product/${p.slug}`, { lastModified: p.updatedAt, priority: 0.7 })),
    ...pages.flatMap((p) => both(`/p/${p.slug}`)),
  ];
}
