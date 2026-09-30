"use server";

import { bustMemo } from "@/lib/memo";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requireStaff } from "@/lib/auth";
import { sendTestNotification } from "@/lib/notify";

export async function savePayments(fd: FormData) {
  const user = await requireStaff("payments.manage");
  const prevRows = await db.content.findMany({ where: { key: { in: ["payments.cod.enabled", "payments.whish.enabled"] } } });
  const prev = Object.fromEntries(prevRows.map((r) => [r.key, r.en]));
  const cod = fd.get("cod") === "1" ? "1" : "0";
  const whish = fd.get("whish") === "1" ? "1" : "0";
  if (cod === "0" && whish === "0") throw new Error("At least one payment method must stay on"); // customers could not order at all
  await db.$transaction([
    db.content.upsert({ where: { key: "payments.cod.enabled" }, update: { en: cod, ar: "" }, create: { key: "payments.cod.enabled", en: cod } }),
    db.content.upsert({ where: { key: "payments.whish.enabled" }, update: { en: whish, ar: "" }, create: { key: "payments.whish.enabled", en: whish } }),
  ]);
  const onOff = (v: string) => (v === "1" ? "ON" : "OFF");
  const ch: string[] = [];
  if ((prev["payments.cod.enabled"] ?? "1") !== cod) ch.push(`cash on delivery ${onOff(cod)}`);
  if ((prev["payments.whish.enabled"] ?? "1") !== whish) ch.push(`Whish Pay ${onOff(whish)}`);
  await audit(user, "settings.payments", "settings", undefined, { cod, whish, changes: ch }, `${user.name} changed payment settings: ${ch.length ? ch.join(", ") : "nothing changed"}`, { level: ch.length ? "warn" : "info" });
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
  bustMemo();
}

/** Customer e-mails: only the order-confirmation e-mail can be switched (confirm-your-email always works when a provider is set). */
export async function saveEmailSettings(fd: FormData) {
  const user = await requireStaff("settings.manage");
  const on = fd.get("orderConfirm") === "1" ? "1" : "0";
  await db.content.upsert({ where: { key: "email.orderConfirm.enabled" }, update: { en: on, ar: "" }, create: { key: "email.orderConfirm.enabled", en: on } });
  await audit(user, "settings.email", "settings", undefined, { orderConfirm: on }, `${user.name} turned the order-confirmation e-mail ${on === "1" ? "ON" : "OFF"}`);
  revalidatePath("/adm", "layout");
  bustMemo();
}

export async function sendTest(): Promise<Record<string, string>> {
  const user = await requireStaff("settings.manage");
  const r = await sendTestNotification();
  await audit(user, "notification.test", "notification", undefined, r, `${user.name} sent a test notification: ${Object.entries(r).map(([k, v]) => k + " " + v).join(", ")}`);
  return r;
}

export type TelegramChat = { id: string; title: string; type: string };

/**
 * Asks Telegram which chats the bot has seen (groups it was added to, people who pressed Start),
 * so the owner can copy the right TELEGRAM_CHAT_ID without touching the API by hand.
 */
export async function findTelegramChats(): Promise<{ ok: true; chats: TelegramChat[] } | { ok: false; error: string }> {
  await requireStaff("settings.manage");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set in .env" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = (await res.json()) as { ok: boolean; description?: string; result?: Record<string, { chat?: { id: number; type: string; title?: string; first_name?: string; username?: string } }>[] };
    if (!data.ok) return { ok: false, error: data.description || "Telegram refused the request" };
    const seen = new Map<string, TelegramChat>();
    for (const u of data.result ?? []) {
      // any update type can carry a chat: messages, my_chat_member (bot added), channel posts…
      for (const part of Object.values(u)) {
        const c = part && typeof part === "object" && "chat" in part ? part.chat : undefined;
        if (c && typeof c.id === "number") seen.set(String(c.id), { id: String(c.id), type: c.type, title: c.title || [c.first_name, c.username && `@${c.username}`].filter(Boolean).join(" ") || String(c.id) });
      }
    }
    return { ok: true, chats: [...seen.values()] };
  } catch (e) {
    const msg = (e as Error).message || "";
    return { ok: false, error: /fetch failed|ENOTFOUND|EAI_AGAIN|timeout|abort/i.test(msg) ? "This computer cannot reach api.telegram.org (blocked network/DNS). Use a VPN, change DNS to 1.1.1.1, or try this on the live server." : msg };
  }
}
