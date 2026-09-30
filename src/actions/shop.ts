"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCustomer, throttle } from "@/lib/auth";
import { getSiteContent } from "@/lib/content";
import { createOrder, OrderError, orderInput, restockOrder, type OrderInput } from "@/lib/orders";
import { emailCustomerConfirmation, notifyNewOrder } from "@/lib/notify";
import { createWhishPayment, whishConfigured } from "@/lib/whish";
import { log } from "@/lib/audit";
import { isLocale, money, normalizePhone, orderCode, parseOrderCode } from "@/lib/utils";

export type PlaceOrderResult =
  | { ok: true; code: string; key: string; payUrl?: string }
  | { ok: false; error: "invalid" | "stock" | "zone" | "items" | "phone" | "payment" | "disabled" | "rate"; detail?: string };

export async function placeOrder(input: OrderInput): Promise<PlaceOrderResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!throttle(`order:${ip}`, 12, 10 * 60_000)) {
    await log({ actor: "Visitor", action: "security.rate-limit", entity: "order", category: "security", level: "warn", summary: "Too many order attempts from one address were blocked" });
    return { ok: false, error: "rate" };
  }

  const parsed = orderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", detail: parsed.error.issues[0]?.path.join(".") };

  const c = await getSiteContent();
  if (parsed.data.paymentMethod === "COD" && !c.on("payments.cod.enabled")) return { ok: false, error: "disabled" };
  if (parsed.data.paymentMethod === "WHISH" && (!c.on("payments.whish.enabled") || !whishConfigured())) return { ok: false, error: "disabled" };

  const customer = await getCustomer();
  let order;
  try {
    order = await createOrder(parsed.data, customer?.id);
  } catch (e) {
    if (e instanceof OrderError) {
      await log({ actor: `Customer: ${parsed.data.email}`, action: "order.rejected", entity: "order", category: "order", level: "warn", summary: `Order from ${parsed.data.email} rejected (${e.code}${e.message && e.message !== e.code ? ": " + e.message : ""})`, meta: { reason: e.code, detail: e.message } });
      return { ok: false, error: e.code, detail: e.message };
    }
    console.error("createOrder failed", e);
    await log({ actor: `Customer: ${parsed.data.email}`, action: "order.failed", entity: "order", category: "order", level: "error", summary: `An order from ${parsed.data.email} could not be created: ${(e as Error).message}` });
    return { ok: false, error: "invalid" };
  }
  const code = orderCode(order.number);
  await log({
    actor: `Customer: ${parsed.data.email}`,
    action: "order.placed",
    entity: "order",
    entityId: order.id,
    category: "order",
    summary: `New order ${code} from ${parsed.data.name} (${parsed.data.email}): ${money(order.total)} by ${parsed.data.paymentMethod === "WHISH" ? "Whish" : "cash on delivery"}, ${parsed.data.items.reduce((n, i) => n + i.qty, 0)} item(s), ${order.zoneName}`,
    meta: { number: code, total: String(order.total), subtotal: String(order.subtotal), deliveryFee: String(order.deliveryFee), method: parsed.data.paymentMethod, zone: order.zoneName, phone: order.phone, flag: order.flag, loggedIn: !!customer },
  });
  if (order.flag) await log({ actor: "System", action: "order.flagged", entity: "order", entityId: order.id, category: "order", level: "warn", summary: `Order ${code} needs review: ${order.flag}` });

  if (parsed.data.paymentMethod === "WHISH") {
    try {
      const payUrl = await createWhishPayment(order.id);
      return { ok: true, code, key: order.accessKey, payUrl };
    } catch (e) {
      console.error("Whish create payment failed", e);
      await log({ actor: "System", action: "payment.create.failed", entity: "order", entityId: order.id, category: "payment", level: "error", summary: `Could not start the Whish payment for order ${code}: ${(e as Error).message}`, meta: { error: (e as Error).message } });
      await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
      await db.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: "Could not create Whish payment" } });
      await restockOrder(order.id, "Whish payment could not start");
      return { ok: false, error: "payment" };
    }
  }

  // Cash on delivery: tell staff right away (fire and forget; never blocks the customer)
  void notifyNewOrder(order.id).catch((e) => console.error("notify failed", e));
  void emailCustomerConfirmation(order.id).catch(() => {});
  return { ok: true, code, key: order.accessKey };
}

/** "Pay now" button on the order page for unpaid Whish orders. */
export async function retryWhishPayment(orderId: string, key: string): Promise<{ ok: boolean; url?: string }> {
  const o = await db.order.findFirst({ where: { id: orderId, accessKey: key, paymentMethod: "WHISH" } });
  if (!o || o.paymentStatus === "PAID" || o.status === "CANCELLED") return { ok: false };
  try {
    return { ok: true, url: await createWhishPayment(o.id) };
  } catch {
    return { ok: false };
  }
}

const trackSchema = z.object({ code: z.string().trim().min(3).max(20), phone: z.string().trim().min(6).max(30), locale: z.string() });

export async function trackOrder(_: unknown, fd: FormData): Promise<{ error: boolean }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!throttle(`track:${ip}`, 15, 10 * 60_000)) {
    await log({ actor: "Visitor", action: "security.rate-limit", entity: "track", category: "security", level: "warn", summary: "Too many order-tracking attempts from one address were blocked" });
    return { error: true };
  }
  const p = trackSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: true };
  const n = parseOrderCode(p.data.code);
  // guessing a phone number for one specific order is limited no matter which address the attempts come from
  if (n && !throttle(`track-order:${n}`, 10, 60 * 60_000)) {
    await log({ actor: "Visitor", action: "security.rate-limit", entity: "order", category: "security", level: "error", summary: `Order JM-${String(n).padStart(5, "0")} is being probed with many phone numbers: lookups for it are blocked for an hour` });
    return { error: true };
  }
  const locale = isLocale(p.data.locale) ? p.data.locale : "en";
  if (!n) return { error: true };
  const o = await db.order.findUnique({ where: { number: n } });
  if (!o || o.phone !== normalizePhone(p.data.phone)) {
    await log({ actor: "Visitor", action: "security.track.failed", entity: "order", category: "security", level: "warn", summary: `Someone tried to look up order ${p.data.code} with a wrong phone number` });
    return { error: true };
  }
  redirect(`/${locale}/order/${orderCode(o.number)}?k=${o.accessKey}`);
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(3).max(2000),
});

export async function submitContact(_: unknown, fd: FormData): Promise<{ ok: boolean }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!throttle(`contact:${ip}`, 5, 10 * 60_000)) return { ok: false };
  if (fd.get("website")) return { ok: true }; // honeypot
  const p = contactSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false };
  await db.contactMessage.create({ data: { name: p.data.name, phone: p.data.phone, email: p.data.email || "", message: p.data.message } });
  await log({ actor: `Visitor: ${p.data.name}`, action: "contact.message", entity: "message", category: "customer", summary: `New contact message from ${p.data.name} (${p.data.phone})` });
  return { ok: true };
}
