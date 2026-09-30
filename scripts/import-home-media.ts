/**
 * Copies the celebrity photos, the 3 before/after pairs and the video cover from jamrexlb.com into this
 * shop's own uploads (converted to light WebP) and fills the matching Website-content fields.
 *   npm run import:home-media
 * Safe to run again: fields that already have a value are left alone (nothing you edited is overwritten).
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const SITE = "https://jamrexlb.com/wp-content/uploads";
const root = path.resolve(process.env.UPLOAD_DIR || "./uploads");

// the celebrity photos of the brand's home page (the one you asked to leave out is not here)
const CELEBS = ["2025/08/vlcsnap-2025-08-18-10h38m17s068", "2025/09/7", "2025/08/vlcsnap-2025-08-18-11h11m42s298", "2025/08/vlcsnap-2025-08-18-13h17m09s086", "2025/08/vlcsnap-2025-08-18-13h18m41s611", "2025/09/2", "2025/08/vlcsnap-2025-08-18-13h21m13s480", "2025/08/vlcsnap-2025-08-18-13h21m57s452", "2025/09/4", "2025/09/1", "2025/09/3", "2025/09/5", "2025/09/6"];
const PAIRS = [
  { n: 1, before: "2025/10/1", after: "2025/10/2", en: "Stained car ceiling", ar: "بقع سقف السيارة", link: "/product/fabric-cleaner" },
  { n: 2, before: "2025/10/11", after: "2025/10/22", en: "Yellowed headlights", ar: "مصابيح أمامية مصفرّة", link: "/product/headlight-yellowing-remover-250ml" },
  { n: 3, before: "2025/10/111", after: "2025/10/222", en: "Rusty wheels", ar: "جنوط صدئة", link: "/product/rust-remover-500ml" },
];

async function fetchImage(url: string, width: number, name: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(url + " -> " + res.status);
  const out = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const d = new Date();
  const rel = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(8).toString("hex")}.webp`;
  await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await fs.writeFile(path.join(root, rel), out);
  await db.mediaAsset.create({ data: { path: rel, name } });
  return rel;
}

async function setIfEmpty(key: string, en: string, ar = en) {
  const row = await db.content.findUnique({ where: { key } });
  if (row && row.en.trim()) return false;
  await db.content.upsert({ where: { key }, update: { en, ar }, create: { key, en, ar } });
  return true;
}

async function main() {
  let done = 0;
  for (const [i, p] of CELEBS.entries()) {
    const key = `home.celebs.img${i + 1}`;
    if ((await db.content.findUnique({ where: { key } }))?.en) continue;
    if (await setIfEmpty(key, await fetchImage(`${SITE}/${p}.png`, 720, `celebrity ${i + 1}`))) done++;
  }
  for (const p of PAIRS) {
    if ((await db.content.findUnique({ where: { key: `home.ba.${p.n}.before` } }))?.en) continue;
    await setIfEmpty(`home.ba.${p.n}.title`, p.en, p.ar);
    await setIfEmpty(`home.ba.${p.n}.before`, await fetchImage(`${SITE}/${p.before}.png`, 1200, `before ${p.en}`));
    await setIfEmpty(`home.ba.${p.n}.after`, await fetchImage(`${SITE}/${p.after}.png`, 1200, `after ${p.en}`));
    await setIfEmpty(`home.ba.${p.n}.link`, p.link);
    done++;
  }
  if (!(await db.content.findUnique({ where: { key: "home.video.poster" } }))?.en) {
    await setIfEmpty("home.video.poster", await fetchImage("https://i.ytimg.com/vi/_DFFhWYitT4/maxresdefault.jpg", 1280, "video cover"));
    done++;
  }
  console.log(`Imported ${done} item(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
