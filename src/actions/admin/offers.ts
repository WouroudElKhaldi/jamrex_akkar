"use server";

import { bustMemo } from "@/lib/memo";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requireStaff } from "@/lib/auth";
import { safeImagePath } from "@/lib/safe-url";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const date = (fd: FormData, k: string) => {
  const v = s(fd, k);
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
const done = () => {
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
  bustMemo();
};

export async function saveOffer(fd: FormData) {
  const user = await requireStaff("offers.manage");
  const id = s(fd, "id");
  const nameEn = s(fd, "nameEn");
  const kind = s(fd, "kind") === "AMOUNT" ? "AMOUNT" : "PERCENT";
  let value = Math.max(0, Number(s(fd, "value")) || 0);
  if (kind === "PERCENT") value = Math.min(100, value);
  const scope = ["ALL", "CATEGORIES", "PRODUCTS"].includes(s(fd, "scope")) ? s(fd, "scope") : "PRODUCTS";
  if (!nameEn || value <= 0) throw new Error("invalid");

  const productIds = scope === "PRODUCTS" ? [...new Set(fd.getAll("productIds").map(String))] : [];
  const categoryIds = scope === "CATEGORIES" ? [...new Set(fd.getAll("categoryIds").map(String))] : [];

  const data = {
    nameEn,
    nameAr: s(fd, "nameAr"),
    descEn: s(fd, "descEn"),
    descAr: s(fd, "descAr"),
    kind,
    value,
    scope,
    active: fd.get("active") === "1",
    showOnHome: fd.get("showOnHome") === "1",
    startsAt: date(fd, "startsAt"),
    endsAt: date(fd, "endsAt"),
    image: safeImagePath(s(fd, "image")) || null,
    sortOrder: Number(s(fd, "sortOrder")) || 0,
  };

  const offerId = await db.$transaction(async (tx) => {
    const o = id ? await tx.offer.update({ where: { id }, data }) : await tx.offer.create({ data });
    await tx.offerProduct.deleteMany({ where: { offerId: o.id } });
    await tx.offerCategory.deleteMany({ where: { offerId: o.id } });
    if (productIds.length) await tx.offerProduct.createMany({ data: productIds.map((productId) => ({ offerId: o.id, productId })) });
    if (categoryIds.length) await tx.offerCategory.createMany({ data: categoryIds.map((categoryId) => ({ offerId: o.id, categoryId })) });
    return o.id;
  });
  const what = `${kind === "PERCENT" ? value + "%" : "$" + value} off ${scope === "ALL" ? "the whole shop" : scope === "CATEGORIES" ? categoryIds.length + " categor" + (categoryIds.length === 1 ? "y" : "ies") : productIds.length + " product" + (productIds.length === 1 ? "" : "s")}`;
  await audit(user, id ? "offer.update" : "offer.create", "offer", offerId, { name: nameEn, kind, value, scope, products: productIds.length, categories: categoryIds.length, startsAt: data.startsAt, endsAt: data.endsAt, active: data.active }, `${user.name} ${id ? "edited" : "created"} offer "${nameEn}": ${what}${data.endsAt ? ", ends " + data.endsAt.toISOString().slice(0, 10) : ""}${data.active ? "" : " (inactive)"}`);
  done();
}

export async function deleteOffer(fd: FormData) {
  const user = await requireStaff("offers.manage");
  const id = s(fd, "id");
  const o = await db.offer.findUnique({ where: { id } });
  await db.offer.delete({ where: { id } });
  await audit(user, "offer.delete", "offer", id, { name: o?.nameEn }, `${user.name} deleted offer "${o?.nameEn ?? id}"`, { level: "warn" });
  done();
}

export async function toggleOffer(fd: FormData) {
  const user = await requireStaff("offers.manage");
  const id = s(fd, "id");
  const o = await db.offer.findUniqueOrThrow({ where: { id } });
  await db.offer.update({ where: { id }, data: { active: !o.active } });
  await audit(user, "offer.toggle", "offer", id, { name: o.nameEn, active: !o.active }, `${user.name} turned offer "${o.nameEn}" ${!o.active ? "ON" : "OFF"}`);
  done();
}
