import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reconcileOrderPayment, whishConfigured } from "@/lib/whish";

export const dynamic = "force-dynamic";

/**
 * Fallback for missing Whish callbacks. Run every ~5 minutes from the server's cron:
 *   curl -s -H "x-cron-secret: $CRON_SECRET" https://jamrexminiyeh.com/api/cron/reconcile
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  // housekeeping (keeps the database small): old activity/notification logs, used or expired tokens
  const day = 86_400_000;
  const [logs, notifs, tokens] = await Promise.all([
    db.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * day) } } }),
    db.notificationLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * day) } } }),
    db.authToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 2 * day) } } }),
  ]).catch(() => [{ count: 0 }, { count: 0 }, { count: 0 }]);
  const cleaned = { logs: logs.count, notifications: notifs.count, tokens: tokens.count };
  if (!whishConfigured()) return NextResponse.json({ skipped: true, cleaned });

  const pending = await db.order.findMany({
    where: { paymentMethod: "WHISH", paymentStatus: "PENDING", createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 48) } },
    select: { id: true },
    take: 100,
  });
  let checked = 0;
  for (const o of pending) {
    await reconcileOrderPayment(o.id).catch(() => {});
    checked++;
  }
  return NextResponse.json({ checked });
}
