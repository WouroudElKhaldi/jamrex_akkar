import "server-only";
import nodemailer from "nodemailer";
import webpush from "web-push";
import { db } from "@/lib/db";
import { getSiteContent } from "@/lib/content";
import { log as auditLog } from "@/lib/audit";
import { money, num, orderCode, siteUrl } from "@/lib/utils";

// All free channels: Telegram bot, Web Push to the staff app, and plain SMTP email.

type FullOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function loadOrder(id: string) {
  return db.order.findUnique({ where: { id }, include: { items: true } });
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

function itemLine(i: FullOrder["items"][number]) {
  const variant = [i.sizeLabelEn, i.optionLabelEn].filter(Boolean).join(" / ");
  return `${i.qty} × ${i.nameEn}${variant ? " (" + variant + ")" : ""} — ${money(num(i.unitPrice) * i.qty)}`;
}

export function orderText(o: FullOrder): string {
  const adminPath = process.env.ADMIN_PATH || "";
  const link = adminPath ? `${siteUrl()}/${adminPath}/orders/${o.id}` : "";
  return [
    `🛒 New order ${orderCode(o.number)}`,
    "",
    ...o.items.map(itemLine),
    "",
    `Subtotal: ${money(o.subtotal)}`,
    `Delivery (${o.zoneName || "-"}): ${money(o.deliveryFee)}`,
    `TOTAL: ${money(o.total)}`,
    `Payment: ${o.paymentMethod === "WHISH" ? "Whish Pay" : "Cash on delivery"} (${o.paymentStatus})`,
    "",
    `Customer: ${o.name}`,
    `Phone: ${o.phone}`,
    `Email: ${o.email}`,
    `Address: ${o.address}`,
    o.notes ? `Notes: ${o.notes}` : "",
    o.flag ? `⚠️ ${o.flag}` : "",
    link ? `\n${link}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

async function log(orderId: string, channel: string, ok: boolean, error?: string) {
  await db.notificationLog.create({ data: { orderId, channel, ok, error: error?.slice(0, 500) } }).catch(() => {});
  if (!ok) await auditLog({ actor: "System", action: "notification.failed", entity: "order", entityId: orderId, category: "notification", level: "error", summary: `${channel} notification could not be delivered: ${(error || "unknown error").slice(0, 160)}`, meta: { channel, error } });
}

async function telegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // TELEGRAM_CHAT_ID may hold one id or several separated by commas: a group id (-100…) and/or
  // the personal ids of employees who pressed "Start" on the bot. Everyone listed gets the alert.
  const chats = (process.env.TELEGRAM_CHAT_ID || "").split(",").map((c) => c.trim()).filter(Boolean);
  if (!token || chats.length === 0) return { skipped: true as const };
  const results = await Promise.allSettled(
    chats.map(async (chat) => {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      });
      if (!res.ok) throw new Error(`Telegram ${res.status} (chat ${chat}): ${await res.text()}`);
    }),
  );
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  // only an error when nobody at all could be reached
  if (failed.length === chats.length) throw failed[0].reason;
  return { skipped: false as const };
}

function mailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const m = mailer();
  if (!m) {
    console.log(`[email not configured] to=${to} subject=${subject}\n${text}`);
    return false;
  }
  await m.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  return true;
}

/** Which service sends customer e-mails: Resend (free tier) if a key is set, else SMTP, else nothing (the link is printed in the server log). */
export const emailProvider = (): "resend" | "smtp" | null => (process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? "smtp" : null);

/**
 * E-mail to a customer (confirm-your-email, set-password, and - when switched on - order confirmation).
 * Resend: https://resend.com/docs/api-reference/emails/send-email  (from address must be on a domain verified in Resend).
 */
export async function sendAccountEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (emailProvider() === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || process.env.MAIL_FROM || "Jamrex Miniyeh <onboarding@resend.dev>", to: [to], subject, text, ...(html ? { html } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return true;
  }
  return sendEmail(to, subject, text, html);
}

let vapidReady = false;
function initVapid() {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@example.com", pub, priv);
  vapidReady = true;
  return true;
}

export async function pushToStaff(payload: { title: string; body: string; url: string }, permission = "orders.alerts") {
  if (!initVapid()) return { skipped: true as const };
  const users = await db.user.findMany({
    where: { active: true, OR: [{ isOwner: true }, { permissions: { some: { key: permission } } }] },
    include: { pushSubs: true },
  });
  const subs = users.flatMap((u) => u.pushSubs);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }),
  );
  return { skipped: false as const, count: subs.length };
}

/** Called after an order is saved. Each channel is independent and failures never affect the order. */
export async function notifyNewOrder(orderId: string) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const text = orderText(o);
  const adminPath = process.env.ADMIN_PATH || "";

  await Promise.all([
    telegram(text).then(
      (r) => (r.skipped ? undefined : log(o.id, "telegram", true)),
      (e) => log(o.id, "telegram", false, String(e?.message || e)),
    ),
    pushToStaff({ title: `New order ${orderCode(o.number)} · ${money(o.total)}`, body: `${o.name} — ${o.zoneName || o.address}`, url: adminPath ? `/${adminPath}/orders/${o.id}` : "/" }).then(
      (r) => (r.skipped ? undefined : log(o.id, "push", true)),
      (e) => log(o.id, "push", false, String(e?.message || e)),
    ),
    (async () => {
      const to = process.env.ORDER_EMAIL_TO || (await getSiteContent()).v("contact.email");
      if (!process.env.SMTP_HOST || !to) return;
      await sendEmail(to, `New order ${orderCode(o.number)}`, text, `<pre style="font-family:inherit">${esc(text)}</pre>`);
      await log(o.id, "email", true);
    })().catch((e) => log(o.id, "email", false, String(e?.message || e))),
  ]);
}

/** Order confirmation to the customer (email only, best effort). */
export async function emailCustomerConfirmation(orderId: string) {
  const o = await loadOrder(orderId);
  // switched OFF by default: turn it on in Settings once a paid e-mail plan is in place
  if (!o || !emailProvider() || !(await getSiteContent()).on("email.orderConfirm.enabled")) return;
  const trackUrl = `${siteUrl()}/${o.locale}/order/${orderCode(o.number)}?k=${o.accessKey}`;
  const text = `Thank you for your order ${orderCode(o.number)}!\n\n${o.items.map(itemLine).join("\n")}\n\nTotal: ${money(o.total)}\n\nTrack your order: ${trackUrl}`;
  await sendAccountEmail(o.email, `Your Jamrex Miniyeh order ${orderCode(o.number)}`, text).catch((e) => console.error("[email] order confirmation failed", e));
}

export async function sendTestNotification() {
  const results: Record<string, string> = {};
  try {
    const r = await telegram("✅ Jamrex Miniyeh: test notification");
    results.telegram = r.skipped ? "not configured" : "sent";
  } catch (e) {
    results.telegram = "error: " + (e as Error).message;
  }
  try {
    const r = await pushToStaff({ title: "Test notification", body: "Push notifications work on this device.", url: "/" });
    results.push = r.skipped ? "not configured" : `sent to ${r.count} device(s)`;
  } catch (e) {
    results.push = "error: " + (e as Error).message;
  }
  return results;
}

export const channelStatus = () => ({
  telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  email: !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
  push: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  whish: !!(process.env.WHISH_CHANNEL && process.env.WHISH_SECRET && process.env.WHISH_WEBSITE_URL),
});
