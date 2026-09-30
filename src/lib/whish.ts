import "server-only";
import { db } from "@/lib/db";
import { emailCustomerConfirmation, notifyNewOrder } from "@/lib/notify";
import { restockOrder } from "@/lib/orders";
import { log } from "@/lib/audit";
import { num, orderCode, siteUrl } from "@/lib/utils";

// Whish Pay integration (docs v1.4.4). Free to integrate: plain REST calls.
// NOTE: implemented from the docs, not yet exercised against the sandbox.

type Envelope<T> = { status: boolean; code: string | null; dialog?: { title?: string; message?: string } | null; data: T | null; retrieved?: boolean };

const base = () => process.env.WHISH_BASE_URL || "https://partner.api.sbx.whish.money/itel-service/api";

export const whishConfigured = () => !!(process.env.WHISH_CHANNEL && process.env.WHISH_SECRET && process.env.WHISH_WEBSITE_URL);

function headers(json = true): Record<string, string> {
  return {
    channel: process.env.WHISH_CHANNEL!,
    secret: process.env.WHISH_SECRET!,
    websiteUrl: process.env.WHISH_WEBSITE_URL!,
    "User-Agent": `JamrexMiniyeh/1.0 (${siteUrl()}; ${process.env.MAIL_FROM_ADDRESS || "info@jamrexminiyeh.com"})`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function call<T>(method: "GET" | "POST", path: string, body?: object): Promise<Envelope<T>> {
  const res = await fetch(base() + path, {
    method,
    headers: headers(method === "POST"),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  // The API always answers HTTP 200 with an envelope; anything else is a transport problem.
  if (!res.ok) throw new Error(`Whish HTTP ${res.status}`);
  return (await res.json()) as Envelope<T>;
}

export const whishExternalId = (orderNumber: number) => `JM${orderNumber}`;

/** Creates the payment link for an order and stores it on the order. Returns the collectUrl. */
export async function createWhishPayment(orderId: string): Promise<string> {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (o.whishUrl) return o.whishUrl; // link stays payable; reuse it

  const externalId = whishExternalId(o.number);
  const q = `externalId=${encodeURIComponent(externalId)}&order=${encodeURIComponent(o.id)}`;
  const site = siteUrl();
  const code = orderCode(o.number);

  const r = await call<{ collectUrl: string }>("POST", "/payment/whish", {
    amount: num(o.total).toFixed(2),
    currency: "USD",
    invoice: `Jamrex Miniyeh order ${code}`.replace(/[^\x20-\x7E]/g, ""),
    externalId,
    successCallbackUrl: `${site}/api/whish/success?${q}`,
    failureCallbackUrl: `${site}/api/whish/failure?${q}`,
    successRedirectUrl: `${site}/${o.locale}/order/${code}?k=${o.accessKey}&paid=1`,
    failureRedirectUrl: `${site}/${o.locale}/order/${code}?k=${o.accessKey}&failed=1`,
  });

  if (!r.status || !r.data?.collectUrl) {
    // status:false + code "500" means "unknown", not failed. Either way we have no link yet.
    throw new Error(`Whish could not create payment: ${r.code || "unknown"} ${r.dialog?.message || ""}`);
  }
  await db.order.update({
    where: { id: o.id },
    data: { whishExternalId: externalId, whishUrl: r.data.collectUrl, paymentStatus: "PENDING" },
  });
  await log({ actor: "System", action: "payment.created", entity: "order", entityId: o.id, category: "payment", summary: `Whish payment link created for order ${code} ($${num(o.total).toFixed(2)})`, meta: { externalId } });
  return r.data.collectUrl;
}

export type CollectStatus = "pending" | "success" | "failed" | "refunded" | "unknown";

export async function getWhishStatus(externalId: string): Promise<CollectStatus | null> {
  const r = await call<{ collectStatus: CollectStatus }>("POST", "/payment/collect/status", { currency: "USD", externalId });
  if (!r.status) return null; // includes "500" pending: do not treat as failure
  return r.data?.collectStatus ?? null;
}

/**
 * The callbacks are unauthenticated GET requests, so we never trust them:
 * we ask Whish for the real status and only then update the order.
 */
export async function reconcileOrderPayment(orderId: string): Promise<CollectStatus | null> {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o || o.paymentMethod !== "WHISH" || !o.whishExternalId) return null;
  if (o.paymentStatus === "PAID" || o.paymentStatus === "REFUNDED") return null;

  const s = await getWhishStatus(o.whishExternalId);
  if (!s) return null;

  if (s === "success") {
    await db.$transaction([
      db.order.update({ where: { id: o.id }, data: { paymentStatus: "PAID" } }),
      db.orderEvent.create({ data: { orderId: o.id, note: "Whish payment confirmed" } }),
    ]);
    // Online orders are announced to staff only once the payment is confirmed.
    await log({ actor: "System", action: "payment.confirmed", entity: "order", entityId: o.id, category: "payment", summary: `Whish confirmed payment for order ${orderCode(o.number)} ($${num(o.total).toFixed(2)})` });
    void notifyNewOrder(o.id).catch(() => {});
    void emailCustomerConfirmation(o.id).catch(() => {});
  } else if (s === "failed") {
    await db.$transaction([
      db.order.update({ where: { id: o.id }, data: { paymentStatus: "FAILED", status: "CANCELLED" } }),
      db.orderEvent.create({ data: { orderId: o.id, status: "CANCELLED", note: "Whish payment link expired unpaid: order cancelled" } }),
    ]);
    await log({ actor: "System", action: "payment.expired", entity: "order", entityId: o.id, category: "payment", level: "warn", summary: `Whish payment for order ${orderCode(o.number)} expired unpaid: order cancelled and stock returned` });
    if (o.status !== "CANCELLED") await restockOrder(o.id, "Online payment expired");
  } else if (s === "refunded") {
    await db.order.update({ where: { id: o.id }, data: { paymentStatus: "REFUNDED" } });
    await log({ actor: "System", action: "payment.refunded", entity: "order", entityId: o.id, category: "payment", level: "warn", summary: `Whish reports order ${orderCode(o.number)} as refunded` });
  }
  // "pending" / "unknown": leave as is (a failed attempt does not end the payment)
  return s;
}

/** Refund needs this server's IP whitelisted by Whish. */
export async function refundWhish(orderId: string, reason: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!o.whishExternalId) throw new Error("This order has no Whish payment");
  const r = await call<null>("POST", "/payment/whish/refund", { currency: "USD", externalId: o.whishExternalId, refundReason: reason.slice(0, 200) });
  if (!r.status) throw new Error(`Refund failed: ${r.code || "unknown"}`);
  await db.$transaction([
    db.order.update({ where: { id: o.id }, data: { paymentStatus: "REFUNDED" } }),
    db.orderEvent.create({ data: { orderId: o.id, note: `Refunded via Whish: ${reason}` } }),
  ]);
}
