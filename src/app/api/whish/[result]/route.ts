import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reconcileOrderPayment } from "@/lib/whish";

export const dynamic = "force-dynamic";

// Whish calls these two URLs with GET after each attempt. They are unauthenticated,
// so we only use them as a hint and confirm the real state with the status API.
export async function GET(req: Request, ctx: { params: Promise<{ result: string }> }) {
  const { result } = await ctx.params;
  if (result !== "success" && result !== "failure") return new NextResponse("Not found", { status: 404 });
  const orderId = new URL(req.url).searchParams.get("order");
  if (orderId) {
    const exists = await db.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (exists) await reconcileOrderPayment(orderId).catch((e) => console.error("whish reconcile", e));
  }
  return NextResponse.json({ ok: true }); // Whish only needs HTTP 200
}
