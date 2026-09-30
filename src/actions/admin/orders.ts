"use server";

import { revalidatePath } from "next/cache";
import { bustMemo } from "@/lib/memo";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireStaff } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/permissions";
import { restockOrder } from "@/lib/orders";
import { refundWhish } from "@/lib/whish";
import { orderCode } from "@/lib/utils";

const done = () => { bustMemo(); revalidatePath("/adm", "layout"); };

export async function updateOrderStatus(fd: FormData) {
  const id = String(fd.get("id"));
  const status = z.enum(ORDER_STATUSES).parse(fd.get("status"));
  const user = await requireStaff(status === "CANCELLED" ? "orders.cancel" : "orders.update");

  const o = await db.order.findUniqueOrThrow({ where: { id } });
  if (o.status === status) return;
  if (o.status === "CANCELLED") return; // cancelled orders are final (stock already returned)

  await db.$transaction([
    db.order.update({ where: { id }, data: { status, ...(status === "DELIVERED" && o.paymentMethod === "COD" ? { paymentStatus: "PAID" } : {}) } }),
    db.orderEvent.create({ data: { orderId: id, status, userId: user.id, note: status === "DELIVERED" && o.paymentMethod === "COD" ? "Delivered, cash collected" : "" } }),
  ]);
  if (status === "CANCELLED") await restockOrder(id, `Order ${orderCode(o.number)} cancelled`, user.name);
  await audit(user, "order.status", "order", id, { number: orderCode(o.number), from: o.status, to: status, total: String(o.total) }, `${user.name} changed order ${orderCode(o.number)} from ${o.status} to ${status}${status === "CANCELLED" ? " (stock returned)" : ""}`, { level: status === "CANCELLED" ? "warn" : "info" });
  done();
}

export async function markOrderPaid(fd: FormData) {
  const id = String(fd.get("id"));
  const user = await requireStaff("orders.update");
  await db.$transaction([
    db.order.update({ where: { id }, data: { paymentStatus: "PAID" } }),
    db.orderEvent.create({ data: { orderId: id, userId: user.id, note: "Marked as paid (cash received)" } }),
  ]);
  const po = await db.order.findUnique({ where: { id }, select: { number: true, total: true } });
  await audit(user, "order.paid", "order", id, { number: po ? orderCode(po.number) : id, total: po ? String(po.total) : undefined }, `${user.name} marked order ${po ? orderCode(po.number) : id} as paid (cash received, $${po ? String(po.total) : "?"})`);
  done();
}

export async function refundOrder(fd: FormData) {
  const id = String(fd.get("id"));
  const user = await requireStaff("orders.refund");
  await refundWhish(id, String(fd.get("reason") || "Refund requested by staff"));
  const ro = await db.order.findUnique({ where: { id }, select: { number: true, total: true } });
  await audit(user, "order.refund", "order", id, { number: ro ? orderCode(ro.number) : id, total: ro ? String(ro.total) : undefined }, `${user.name} refunded order ${ro ? orderCode(ro.number) : id} via Whish ($${ro ? String(ro.total) : "?"})`, { level: "warn", category: "payment" });
  done();
}

export async function addOrderNote(fd: FormData) {
  const id = String(fd.get("id"));
  const note = String(fd.get("note") || "").trim().slice(0, 500);
  const user = await requireStaff("orders.update");
  if (!note) return;
  await db.orderEvent.create({ data: { orderId: id, userId: user.id, note } });
  const no = await db.order.findUnique({ where: { id }, select: { number: true } });
  await audit(user, "order.note", "order", id, { number: no ? orderCode(no.number) : id, note }, `${user.name} added a note to order ${no ? orderCode(no.number) : id}: "${note.slice(0, 80)}"`);
  done();
}

export async function clearOrderFlag(fd: FormData) {
  const id = String(fd.get("id"));
  const user = await requireStaff("orders.update");
  await db.order.update({ where: { id }, data: { flag: null } });
  await audit(user, "order.flag.clear", "order", id, {}, `${user.name} reviewed and cleared the warning flag on an order`);
  done();
}
