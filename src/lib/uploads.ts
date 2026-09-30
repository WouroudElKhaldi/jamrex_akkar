import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";

export const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR || "./uploads");

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * Validates an image buffer, converts it to an optimised WebP (max 1600px) and
 * stores it on disk under uploads/YYYY/MM/. Returns the relative path.
 */
export async function saveImage(buf: Buffer, originalName: string, mime: string): Promise<string> {
  if (!ALLOWED.has(mime)) throw new Error("Only JPG, PNG, WebP, GIF or AVIF images are allowed");
  if (buf.length > MAX_BYTES) throw new Error("Image is larger than 10MB");

  const img = sharp(buf, { failOn: "error" }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("Invalid image");

  const out = await img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();

  const now = new Date();
  const rel = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(8).toString("hex")}.webp`;
  const abs = path.join(uploadRoot(), rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, out);

  await db.mediaAsset.create({ data: { path: rel, name: originalName.slice(0, 120) } });
  return rel;
}

export async function deleteImageFile(rel: string) {
  if (!rel || rel.startsWith("http") || rel.includes("..")) return;
  try {
    await fs.unlink(path.join(uploadRoot(), rel));
  } catch {
    /* already gone */
  }
}

export function contentTypeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  return (
    { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" }[ext] ||
    "application/octet-stream"
  );
}
