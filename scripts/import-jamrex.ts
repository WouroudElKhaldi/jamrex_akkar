/**
 * Imports the Jamrex Lebanon catalogue (public WooCommerce Store API) as a STARTING POINT for Miniyeh:
 *   • size listings of the same product ("Laundry Powder 4kg" + "…8kg") become ONE product with a size picker
 *   • scent / colour attributes become option buttons; each option is linked to the matching gallery photo
 *     (guessed from the file name — staff can fix it in the dashboard)
 *   • photos are downloaded, optimised to WebP and stored in UPLOAD_DIR
 *   • Arabic names/short descriptions are read from the /ar pages when they really are Arabic
 *
 *   npm run import:jamrex            (aborts if products already exist)
 *   npm run import:jamrex -- --force (deletes existing products first)
 *
 * Stock is a PLACEHOLDER (20 if Jamrex shows it in stock, else 0): staff must enter the real Miniyeh stock.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const db = new PrismaClient();
const BASE = "https://jamrexlb.com";
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const FORCE = process.argv.includes("--force");
const UA = { "User-Agent": "Mozilla/5.0 (JamrexMiniyehImporter)" };

type ApiProduct = {
  id: number; name: string; slug: string; description: string; short_description: string;
  prices: { price: string; regular_price: string; currency_minor_unit: number };
  is_in_stock: boolean;
  categories: { slug: string; name: string }[];
  attributes: { name: string; terms: { name: string }[] }[];
  images: { src: string; alt: string }[];
};

// ───────── helpers ─────────
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&(\w+);/g, (m, n) => ENT[n] ?? m);
const strip = (html: string) => decode(html.replace(/<\/(p|li|div|h\d)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const hasArabic = (s: string) => /[؀-ۿ]/.test(s);
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SIZE_RE = /^(.*?)[\s\-–]*(\d+(?:[.,]\d+)?)\s?(ml|l|lt|ltr|kg|g|gm)$/i;
const UNIT_EN: Record<string, string> = { ml: "ml", l: "L", lt: "L", ltr: "L", kg: "kg", g: "g", gm: "g" };
const UNIT_AR: Record<string, string> = { ml: "مل", L: "لتر", kg: "كغ", g: "غ" };
const AR_SIZE_RE = /\s*[\d.,]+\s*(مل|لتر|ل|كجم|كغ|كج|غم|غ|جم)\s*$/;

function parseSize(name: string) {
  const m = name.trim().match(SIZE_RE);
  if (!m || !m[1].trim()) return null;
  const unit = UNIT_EN[m[3].toLowerCase()];
  const value = m[2].replace(",", ".");
  return { base: m[1].trim(), value, unit, labelEn: `${value} ${unit}`, labelAr: `${value} ${UNIT_AR[unit]}`, sortKey: Number(value) * (unit === "kg" || unit === "L" ? 1000 : 1) };
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as T;
}

async function fetchArabic(slug: string): Promise<{ name: string; short: string } | null> {
  try {
    const r = await fetch(`${BASE}/ar/product/${slug}/`, { headers: UA });
    if (!r.ok) return null;
    const html = await r.text();
    const h1 = html.match(/<h1[^>]*product_title[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    const sd = html.match(/woocommerce-product-details__short-description[^>]*>([\s\S]*?)<\/div>/i)?.[1];
    const name = h1 ? strip(h1) : "";
    const short = sd ? strip(sd) : "";
    return { name: hasArabic(name) ? name : "", short: hasArabic(short) ? short : "" };
  } catch {
    return null;
  }
}

const imgCache = new Map<string, string>();
async function storeImage(src: string): Promise<string | null> {
  if (imgCache.has(src)) return imgCache.get(src)!;
  try {
    const r = await fetch(src, { headers: UA });
    if (!r.ok) return null;
    const out = await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const d = new Date();
    const rel = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(8).toString("hex")}.webp`;
    await fs.mkdir(path.dirname(path.join(UPLOAD_DIR, rel)), { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, rel), out);
    await db.mediaAsset.create({ data: { path: rel, name: decodeURIComponent(src.split("/").pop() || "image").slice(0, 120) } });
    imgCache.set(src, rel);
    return rel;
  } catch (e) {
    console.warn("  ! image failed", src, (e as Error).message);
    return null;
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

/** Guess which gallery photo shows which option, from the photo file name. */
function matchImages(optionLabels: string[], srcs: string[]): Map<string, string> {
  const files = srcs.map((s) => ({ src: s, name: letters(decodeURIComponent(s.split("/").pop() || "").replace(/\.\w+$/, "")) }));
  const res = new Map<string, string>();
  for (const label of optionLabels) {
    const whole = letters(label);
    const tokens = label.toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4);
    let best: { src: string; score: number } | null = null;
    for (const f of files) {
      let score = 0;
      if (whole.length >= 3 && f.name.includes(whole)) score += 10;
      for (const t of tokens) if (f.name.includes(t)) score += 1;
      if (score > 0 && (!best || score > best.score)) best = { src: f.src, score };
    }
    if (best) res.set(label, best.src);
  }
  return res;
}

// ───────── main ─────────
async function main() {
  if ((await db.product.count()) > 0) {
    if (!FORCE) throw new Error("Products already exist. Re-run with --force to delete them and import again.");
    await db.product.deleteMany();
    console.log("• existing products deleted");
  }
  const cats = await db.category.findMany();
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
  if (cats.length === 0) throw new Error("Run `npm run db:seed` first (categories are created there).");

  console.log("Fetching product list…");
  const api: ApiProduct[] = [];
  for (let p = 1; p < 6; p++) {
    const page = await getJson<ApiProduct[]>(`${BASE}/wp-json/wc/store/v1/products?per_page=100&page=${p}`);
    if (!page.length) break;
    api.push(...page);
  }
  console.log(`  ${api.length} products`);

  const clean = (p: ApiProduct) => ({ ...p, name: decode(p.name).trim() });
  const list = api.map(clean);

  // group into families
  type Member = { p: ApiProduct; size: NonNullable<ReturnType<typeof parseSize>> | null };
  const families = new Map<string, Member[]>();
  const singles: Member[] = [];
  const seen = new Set<string>();
  for (const p of list.sort((a, b) => b.id - a.id)) {
    if (p.name.toLowerCase() === "powder 8kg") { console.warn(`  ! skipped "${p.name}" (duplicate of Laundry Powder 8kg)`); continue; }
    const size = parseSize(p.name);
    if (!size) { singles.push({ p, size: null }); continue; }
    const key = slugify(size.base) + "|" + (p.categories[0]?.slug ?? "");
    const dup = `${key}|${size.value}${size.unit}`;
    if (seen.has(dup)) { console.warn(`  ! duplicate listing skipped: ${p.name} (id ${p.id})`); continue; }
    seen.add(dup);
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push({ p, size });
  }
  // families with one size are not merged
  for (const [k, members] of [...families]) {
    if (members.length < 2) { singles.push({ p: members[0].p, size: null }); families.delete(k); }
  }

  const units: { members: Member[]; merged: boolean }[] = [
    ...[...families.values()].map((members) => ({ members: members.sort((a, b) => a.size!.sortKey - b.size!.sortKey), merged: true })),
    ...singles.map((s) => ({ members: [s], merged: false })),
  ];
  console.log(`  → ${units.length} products after merging sizes (${families.size} merged families)`);

  // Arabic pages
  console.log("Fetching Arabic names…");
  const arMap = new Map<number, { name: string; short: string } | null>();
  await pool(list, 6, async (p) => { arMap.set(p.id, await fetchArabic(p.slug)); });

  let order = 0;
  const catFirstImage = new Map<string, string>();
  const maxId = Math.max(...list.map((p) => p.id));

  for (const u of units) {
    order++;
    const first = u.members[0].p;
    const lead = u.members[u.members.length - 1].p; // largest size / newest text
    const baseEn = u.merged ? u.members[0].size!.base : first.name;
    const ar = arMap.get(first.id);
    const baseAr = u.merged && ar?.name ? ar.name.replace(AR_SIZE_RE, "").trim() : ar?.name || "";

    // options = union of scent/colour terms; members without terms get all options (flagged)
    const attrName = (m: Member) => m.p.attributes.find((a) => /scent|color|colour/i.test(a.name));
    const kind = u.members.some((m) => /color|colour/i.test(attrName(m)?.name ?? "")) ? "COLOR" : "SCENT";
    const optionLabels: string[] = [];
    for (const m of u.members) for (const t of attrName(m)?.terms ?? []) { const l = decode(t.name).trim(); if (l && !optionLabels.some((x) => x.toLowerCase() === l.toLowerCase())) optionLabels.push(l); }

    // images
    const srcs = [...new Set(u.members.flatMap((m) => m.p.images.map((i) => i.src)))];
    const stored = new Map<string, string>();
    await pool(srcs, 4, async (s) => { const r = await storeImage(s); if (r) stored.set(s, r); });
    const guess = matchImages(optionLabels, srcs);

    const catSlugs = [...new Set(u.members.flatMap((m) => m.p.categories.map((c) => c.slug)))];
    if (catSlugs.length === 0) catSlugs.push("car-care");
    const isBundle = catSlugs.includes("offers");

    let slug = slugify(baseEn) || `product-${first.id}`;
    for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) slug = `${slugify(baseEn)}-${i}`;

    const product = await db.product.create({
      data: {
        slug,
        nameEn: baseEn,
        nameAr: baseAr,
        shortEn: strip(lead.short_description).slice(0, 500),
        shortAr: ar?.short?.slice(0, 500) ?? "",
        descEn: strip(lead.description) === strip(lead.short_description) ? "" : strip(lead.description),
        descAr: "",
        active: true,
        featured: u.merged && order <= 40 && u.members.length >= 2 && !isBundle,
        isNew: first.id >= maxId - 400,
        sortOrder: order,
        optionKind: kind,
        categories: { create: catSlugs.filter((s) => catBySlug.has(s)).map((s) => ({ categoryId: catBySlug.get(s)! })) },
      },
    });

    const imgIdBySrc = new Map<string, string>();
    let idx = 0;
    for (const s of srcs) {
      const rel = stored.get(s);
      if (!rel) continue;
      const im = await db.productImage.create({ data: { productId: product.id, path: rel, alt: "", sortOrder: idx++ } });
      imgIdBySrc.set(s, im.id);
      if (!catFirstImage.has(catSlugs[0])) catFirstImage.set(catSlugs[0], rel);
    }

    const sizeIds = new Map<number, string>();
    if (u.merged) {
      for (const [i, m] of u.members.entries()) {
        const s = await db.productSize.create({ data: { productId: product.id, labelEn: m.size!.labelEn, labelAr: m.size!.labelAr, sortOrder: i } });
        sizeIds.set(m.p.id, s.id);
      }
    }
    const optIds = new Map<string, string>();
    for (const [i, label] of optionLabels.entries()) {
      const src = guess.get(label);
      const o = await db.productOption.create({ data: { productId: product.id, labelEn: label, labelAr: "", imageId: src ? imgIdBySrc.get(src) ?? null : null, sortOrder: i } });
      optIds.set(label.toLowerCase(), o.id);
    }

    for (const m of u.members) {
      const minor = m.p.prices.currency_minor_unit ?? 2;
      const price = Number(m.p.prices.price) / 10 ** minor;
      const regular = Number(m.p.prices.regular_price) / 10 ** minor;
      const stock = m.p.is_in_stock ? 20 : 0;
      const own = (attrName(m)?.terms ?? []).map((t) => decode(t.name).trim().toLowerCase());
      const targets = optionLabels.length === 0 ? [null] : own.length ? own : optionLabels.map((l) => l.toLowerCase());
      if (optionLabels.length && !own.length) console.warn(`  ! "${m.p.name}" has no scents on Jamrex: gave it all ${optionLabels.length} options of "${baseEn}" — please verify`);
      for (const t of targets) {
        await db.variant.create({
          data: {
            productId: product.id,
            sizeId: u.merged ? sizeIds.get(m.p.id)! : null,
            optionId: t ? optIds.get(t) ?? null : null,
            price,
            compareAtPrice: regular > price ? regular : null,
            stock,
          },
        });
      }
    }
    console.log(`✔ ${baseEn}${u.merged ? ` (${u.members.length} sizes)` : ""}${optionLabels.length ? ` · ${optionLabels.length} ${kind.toLowerCase()}s` : ""}${baseAr ? "" : "  [no Arabic]"}`);
  }

  // category thumbnails
  for (const [slug, rel] of catFirstImage) await db.category.updateMany({ where: { slug, image: null }, data: { image: rel } });
  console.log("\nDone. Next: open the dashboard → Products, check scent↔photo links, Arabic names, real stock and prices.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
