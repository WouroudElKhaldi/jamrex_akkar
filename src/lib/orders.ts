import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { bustMemo } from "@/lib/memo";
import { randomToken } from "@/lib/auth";
import { bestOffer, loadActiveOffers } from "@/lib/offers";
import { isValidPhone, normalizeEmail, normalizePhone, num } from "@/lib/utils";

export const orderInput = z.object({
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).max(99) })).min(1).max(60),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  zoneId: z.string().min(1),
  address: z.string().trim().min(4).max(400),
  notes: z.string().trim().max(500).optional().default(""),
  paymentMethod: z.enum(["COD", "WHISH"]),
  locale: z.enum(["en", "ar"]).default("en"),
});
export type OrderInput = z.infer<typeof orderInput>;

export class OrderError extends Error {
  constructor(public code: "stock" | "zone" | "items" | "phone" | "payment", message?: string) {
    super(message || code);
  }
}

/** Server-side order creation: prices and stock always come from the database, never from the browser. */
export async function createOrder(input: OrderInput, sessionCustomerId?: string | null) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!isValidPhone(phone)) throw new OrderError("phone");

  // merge duplicate lines
  const wanted = new Map<string, number>();
  for (const it of input.items) wanted.set(it.variantId, (wanted.get(it.variantId) || 0) + it.qty);

  const variants = await db.variant.findMany({
    where: { id: { in: [...wanted.keys()] }, active: true, product: { active: true } },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, categories: true } }, size: true, option: true },
  });
  if (variants.length !== wanted.size) throw new OrderError("items");

  const zone = await db.deliveryZone.findFirst({ where: { id: input.zoneId, active: true } });
  if (!zone) throw new OrderError("zone");

  const offers = await loadActiveOffers();
  let subtotal = 0;
  const lines = variants.map((v) => {
    const qty = wanted.get(v.id)!;
    if (v.stock < qty) throw new OrderError("stock", v.product.nameEn);
    const base = num(v.price);
    const deal = bestOffer(base, v.productId, v.product.categories.map((c) => c.categoryId), offers);
    const unit = deal ? deal.price : base;
    subtotal += unit * qty;
    const optImage = v.option?.imageId ? v.product.images.find((i) => i.id === v.option!.imageId) : undefined;
    return {
      variantId: v.id,
      productId: v.productId,
      qty,
      unitPrice: unit,
      originalPrice: deal ? base : null,
      offerName: deal ? deal.offer.nameEn : "",
      nameEn: v.product.nameEn,
      nameAr: v.product.nameAr,
      sizeLabelEn: v.size?.labelEn ?? "",
      sizeLabelAr: v.size?.labelAr ?? "",
      optionLabelEn: v.option?.labelEn ?? "",
      optionLabelAr: v.option?.labelAr ?? "",
      image: (optImage ?? v.product.images[0])?.path ?? null,
    };
  });

  const freeOver = zone.freeOver ? num(zone.freeOver) : null;
  const deliveryFee = freeOver !== null && subtotal >= freeOver ? 0 : num(zone.fee);
  const total = subtotal + deliveryFee;

  // find / create the customer record (email and phone are both unique)
  const [byEmail, byPhone] = await Promise.all([db.customer.findUnique({ where: { email } }), db.customer.findUnique({ where: { phone } })]);
  let flag: string | null = null;
  let customerId: string;
  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    customerId = byEmail.id;
    flag = `Phone ${phone} belongs to another customer record (${byPhone.email})`;
  } else if (byEmail) {
    customerId = byEmail.id;
  } else if (byPhone) {
    customerId = byPhone.id;
    flag = `Email ${email} differs from the customer record (${byPhone.email})`;
  } else {
    const c = await db.customer.create({ data: { email, phone, name: input.name, address: input.address, zoneId: zone.id } });
    customerId = c.id;
  }
  if (sessionCustomerId && sessionCustomerId !== customerId) {
    flag = (flag ? flag + "; " : "") + "Logged-in account differs from the email/phone used";
  }

  const order = await db.$transaction(async (tx) => {
    for (const l of lines) {
      const r = await tx.variant.updateMany({ where: { id: l.variantId!, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
      if (r.count === 0) throw new OrderError("stock", l.nameEn);
      await tx.stockLog.create({ data: { variantId: l.variantId!, delta: -l.qty, reason: "Order" } });
    }
    return tx.order.create({
      data: {
        accessKey: randomToken().slice(0, 24),
        paymentMethod: input.paymentMethod,
        paymentStatus: "UNPAID",
        customerId,
        name: input.name,
        email,
        phone,
        address: input.address,
        zoneId: zone.id,
        zoneName: zone.nameEn,
        notes: input.notes ?? "",
        subtotal,
        deliveryFee,
        total,
        locale: input.locale,
        flag,
        items: { create: lines },
        events: { create: { status: "NEW", note: "Order placed" } },
      },
    });
  });
  bustMemo(); // stock changed: shop pages must not show old numbers
  return order;
}

/** Puts the stock of every item of an order back (used on cancel / expired online payment). */
export async function restockOrder(orderId: string, reason: string, userName?: string) {
  const items = await db.orderItem.findMany({ where: { orderId, variantId: { not: null } } });
  await db.$transaction(
    items.flatMap((i) => [
      db.variant.update({ where: { id: i.variantId! }, data: { stock: { increment: i.qty } } }),
      db.stockLog.create({ data: { variantId: i.variantId!, delta: i.qty, reason, userName } }),
    ]),
  );
  bustMemo();
}
