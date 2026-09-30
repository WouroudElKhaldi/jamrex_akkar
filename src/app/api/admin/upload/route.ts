import { NextResponse } from "next/server";
import { audit, staffWith, can, throttle } from "@/lib/auth";
import { sameOrigin, tooLarge } from "@/lib/request-guard";
import { log } from "@/lib/audit";
import { saveImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 }); // blocks cross-site form/fetch uploads
  if (tooLarge(req, 40 * 1024 * 1024)) return NextResponse.json({ error: "Upload too large" }, { status: 413 });
  const u = await staffWith();
  if (!u || !(can(u, "products.edit") || can(u, "media.manage") || can(u, "content.edit") || can(u, "banners.manage") || can(u, "categories.manage"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!throttle(`upload:${u.id}`, 60, 60_000)) {
    await log({ user: u, action: "security.rate-limit", entity: "upload", category: "security", level: "warn", summary: `${u.name} was rate-limited while uploading files` });
    return NextResponse.json({ error: "Too many uploads, wait a minute" }, { status: 429 });
  }
  const fd = await req.formData();
  const files = fd.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No file" }, { status: 400 });

  const paths: string[] = [];
  try {
    for (const f of files.slice(0, 20)) {
      paths.push(await saveImage(Buffer.from(await f.arrayBuffer()), f.name, f.type));
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await audit(u, "upload", "media", undefined, { count: paths.length });
  return NextResponse.json({ paths });
}
