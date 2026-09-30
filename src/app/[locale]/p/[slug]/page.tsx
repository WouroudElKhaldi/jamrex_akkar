import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SimpleMarkdown } from "@/lib/markdown";
import { isLocale, pick } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await db.page.findFirst({ where: { slug, published: true } });
  return p && isLocale(locale) ? { title: pick(locale, p.titleEn, p.titleAr) } : {};
}

export default async function CmsPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const p = await db.page.findFirst({ where: { slug, published: true } });
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">{pick(locale, p.titleEn, p.titleAr)}</h1>
      <div className="mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />
      <div className="mt-8"><SimpleMarkdown text={pick(locale, p.bodyEn, p.bodyAr)} /></div>
    </article>
  );
}
