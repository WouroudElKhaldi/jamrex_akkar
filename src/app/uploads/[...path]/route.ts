import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { contentTypeFor, uploadRoot } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  if (rel.includes("..") || rel.includes("\\")) return new NextResponse("Not found", { status: 404 });

  const root = uploadRoot();
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) return new NextResponse("Not found", { status: 404 });

  try {
    let data: Buffer;
    try {
      data = await fs.readFile(abs);
    } catch (e) {
      // "<name>-sm.webp" = 480px thumbnail: create it from the original the first time it is asked for, then it is a plain file
      if (!/^[\w/-]+-sm\.webp$/.test(rel)) throw e;
      const original = path.resolve(root, rel.replace(/-sm\.webp$/, ".webp"));
      if (!original.startsWith(root + path.sep)) throw e;
      data = await sharp(await fs.readFile(original)).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      await fs.writeFile(abs, data).catch(() => {});
    }
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(abs),
        // file names are random, so they never change: cache for a year
        "Cache-Control": "public, max-age=31536000, immutable",
        // uploaded files are images only: never let a browser treat one as a page or run anything from it
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-site",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
