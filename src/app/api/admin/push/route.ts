import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { staffWith } from "@/lib/auth";
import { sameOrigin } from "@/lib/request-guard";

export const dynamic = "force-dynamic";

// push endpoints are always https URLs of the browser vendor's push service
const sub = z.object({ endpoint: z.string().url().max(600).startsWith("https://"), keys: z.object({ p256dh: z.string(), auth: z.string() }) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const u = await staffWith();
  if (!u) return new NextResponse("Unauthorized", { status: 401 });
  const p = sub.safeParse(await req.json().catch(() => null));
  if (!p.success) return new NextResponse("Bad request", { status: 400 });
  await db.pushSubscription.upsert({
    where: { endpoint: p.data.endpoint },
    update: { userId: u.id, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth },
    create: { userId: u.id, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const u = await staffWith();
  if (!u) return new NextResponse("Unauthorized", { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await db.pushSubscription.deleteMany({ where: { endpoint, userId: u.id } });
  return NextResponse.json({ ok: true });
}
