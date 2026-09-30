"use server";

import { bustMemo } from "@/lib/memo";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requireStaff } from "@/lib/auth";
import { ALL_FIELDS } from "@/lib/content-registry";
import { change } from "@/lib/audit";
import { num, slugify } from "@/lib/utils";
import { safeImagePath, safeLink, safeMapEmbed } from "@/lib/safe-url";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const b = (fd: FormData, k: string) => fd.get(k) === "1";
const n = (fd: FormData, k: string, d = 0) => (Number.isFinite(Number(fd.get(k))) && s(fd, k) !== "" ? Number(fd.get(k)) : d);
const done = () => {
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
  bustMemo();
};

// ───────── website text / sections (registry-driven) ─────────
export async function saveContent(fd: FormData) {
  const user = await requireStaff("content.edit");
  const group = s(fd, "group");
  // toggles always post a hidden "tgm:" marker (an unchecked checkbox posts nothing)
  const fields = ALL_FIELDS.filter((f) => fd.has(`en:${f.key}`) || fd.has(`tgm:${f.key}`));
  const before = new Map((await db.content.findMany({ where: { key: { in: fields.map((f) => f.key) } } })).map((r) => [r.key, r]));
  const ops = [];
  const changes: { key: string; from: string; to: string }[] = [];
  for (const f of fields) {
    let en: string;
    let ar = "";
    if (f.type === "toggle") en = fd.get(`tg:${f.key}`) === "1" ? "1" : "0";
    else {
      en = String(fd.get(`en:${f.key}`) ?? "").slice(0, 4000);
      // links/images/maps are cleaned so a "javascript:" link or a foreign iframe can never be saved
      if (f.key === "contact.mapEmbed") en = safeMapEmbed(en);
      else if (f.type === "url") en = safeLink(en);
      else if (f.type === "image") en = safeImagePath(en);
      ar = f.bilingual ? String(fd.get(`ar:${f.key}`) ?? "").slice(0, 4000) : "";
    }
    const old = before.get(f.key);
    const oldEn = old ? old.en : f.def.en;
    const oldAr = old ? old.ar : f.def.ar;
    if (oldEn !== en) changes.push({ key: f.key + (f.bilingual ? " (EN)" : ""), from: oldEn.slice(0, 200), to: en.slice(0, 200) });
    if (f.bilingual && oldAr !== ar) changes.push({ key: f.key + " (AR)", from: oldAr.slice(0, 200), to: ar.slice(0, 200) });
    ops.push(db.content.upsert({ where: { key: f.key }, update: { en, ar }, create: { key: f.key, en, ar } }));
  }
  await db.$transaction(ops);
  const list = changes.slice(0, 6).map((c) => change(c.key, c.from, c.to));
  await audit(user, "content.save", "content", group, { group, changes }, `${user.name} edited website content (${group}): ${changes.length ? list.join("; ") + (changes.length > 6 ? ` (+${changes.length - 6} more)` : "") : "nothing changed"}`);
  done();
}

// ───────── categories ─────────
export async function saveCategory(fd: FormData) {
  const user = await requireStaff("categories.manage");
  const id = s(fd, "id");
  const nameEn = s(fd, "nameEn");
  if (!nameEn) return;
  const data = { nameEn, nameAr: s(fd, "nameAr"), descEn: s(fd, "descEn"), descAr: s(fd, "descAr"), image: safeImagePath(s(fd, "image")) || null, sortOrder: n(fd, "sortOrder"), visible: b(fd, "visible") };
  if (id) {
    const old = await db.category.findUnique({ where: { id } });
    await db.category.update({ where: { id }, data: { ...data, ...(s(fd, "slug") ? { slug: slugify(s(fd, "slug")) } : {}) } });
    const ch: string[] = [];
    if (old) {
      if (old.nameEn !== nameEn) ch.push(change("name", old.nameEn, nameEn));
      if (old.visible !== data.visible) ch.push(data.visible ? "made visible" : "hidden");
      if (old.sortOrder !== data.sortOrder) ch.push(change("order", old.sortOrder, data.sortOrder));
      if ((old.image ?? null) !== data.image) ch.push("picture changed");
    }
    await audit(user, "category.update", "category", id, { name: nameEn, changes: ch }, `${user.name} edited category "${nameEn}"${ch.length ? ": " + ch.join("; ") : ""}`);
  } else {
    let slug = slugify(s(fd, "slug") || nameEn) || "category";
    for (let i = 2; await db.category.findUnique({ where: { slug } }); i++) slug = `${slugify(nameEn)}-${i}`;
    const c = await db.category.create({ data: { ...data, slug } });
    await audit(user, "category.create", "category", c.id, { name: nameEn }, `${user.name} created category "${nameEn}"`);
  }
  done();
}

export async function deleteCategory(fd: FormData) {
  const user = await requireStaff("categories.manage");
  const id = s(fd, "id");
  const c = await db.category.findUnique({ where: { id } });
  await db.category.delete({ where: { id } });
  await audit(user, "category.delete", "category", id, { name: c?.nameEn }, `${user.name} deleted category "${c?.nameEn ?? id}"`, { level: "warn" });
  done();
}

// ───────── delivery zones ─────────
export async function saveZone(fd: FormData) {
  const user = await requireStaff("delivery.manage");
  const id = s(fd, "id");
  const nameEn = s(fd, "nameEn");
  if (!nameEn) return;
  const freeOver = s(fd, "freeOver");
  const data = { nameEn, nameAr: s(fd, "nameAr"), fee: Math.max(0, n(fd, "fee")), freeOver: freeOver ? Math.max(0, Number(freeOver)) : null, active: b(fd, "active"), sortOrder: n(fd, "sortOrder") };
  if (id) {
    const old = await db.deliveryZone.findUnique({ where: { id } });
    await db.deliveryZone.update({ where: { id }, data });
    const ch: string[] = [];
    if (old) {
      if (num(old.fee) !== data.fee) ch.push(change("fee", `$${num(old.fee)}`, `$${data.fee}`));
      if ((old.freeOver ? num(old.freeOver) : null) !== data.freeOver) ch.push(change("free delivery over", old.freeOver ? `$${num(old.freeOver)}` : null, data.freeOver !== null ? `$${data.freeOver}` : null));
      if (old.active !== data.active) ch.push(data.active ? "activated" : "deactivated");
      if (old.nameEn !== nameEn) ch.push(change("name", old.nameEn, nameEn));
    }
    await audit(user, "zone.update", "zone", id, { name: nameEn, changes: ch }, `${user.name} edited delivery area "${nameEn}"${ch.length ? ": " + ch.join("; ") : ""}`);
  } else {
    const z = await db.deliveryZone.create({ data });
    await audit(user, "zone.create", "zone", z.id, { name: nameEn, fee: data.fee }, `${user.name} added delivery area "${nameEn}" ($${data.fee})`);
  }
  done();
}

export async function deleteZone(fd: FormData) {
  const user = await requireStaff("delivery.manage");
  const z = await db.deliveryZone.findUnique({ where: { id: s(fd, "id") } });
  await db.deliveryZone.delete({ where: { id: s(fd, "id") } });
  await audit(user, "zone.delete", "zone", s(fd, "id"), { name: z?.nameEn }, `${user.name} deleted delivery area "${z?.nameEn ?? s(fd, "id")}"`, { level: "warn" });
  done();
}

// ───────── banners ─────────
export async function saveBanner(fd: FormData) {
  const user = await requireStaff("banners.manage");
  const id = s(fd, "id");
  const titleEn = s(fd, "titleEn");
  if (!titleEn) return;
  const data = { titleEn, titleAr: s(fd, "titleAr"), subtitleEn: s(fd, "subtitleEn"), subtitleAr: s(fd, "subtitleAr"), ctaEn: s(fd, "ctaEn"), ctaAr: s(fd, "ctaAr"), link: safeLink(s(fd, "link")), image: safeImagePath(s(fd, "image")) || null, active: b(fd, "active"), sortOrder: n(fd, "sortOrder") };
  const row = id ? await db.banner.update({ where: { id }, data }) : await db.banner.create({ data });
  await audit(user, id ? "banner.update" : "banner.create", "banner", row.id, { title: titleEn, active: data.active }, `${user.name} ${id ? "edited" : "created"} banner "${titleEn}"${data.active ? "" : " (inactive)"}`);
  done();
}
export async function deleteBanner(fd: FormData) {
  const user = await requireStaff("banners.manage");
  const x = await db.banner.findUnique({ where: { id: s(fd, "id") } });
  await db.banner.delete({ where: { id: s(fd, "id") } });
  await audit(user, "banner.delete", "banner", s(fd, "id"), { title: x?.titleEn }, `${user.name} deleted banner "${x?.titleEn ?? s(fd, "id")}"`, { level: "warn" });
  done();
}

// ───────── testimonials ─────────
export async function saveTestimonial(fd: FormData) {
  const user = await requireStaff("banners.manage");
  const id = s(fd, "id");
  const textEn = s(fd, "textEn");
  if (!textEn || !s(fd, "nameEn")) return;
  const data = { nameEn: s(fd, "nameEn"), nameAr: s(fd, "nameAr"), textEn, textAr: s(fd, "textAr"), rating: Math.min(5, Math.max(1, n(fd, "rating", 5))), visible: b(fd, "visible"), sortOrder: n(fd, "sortOrder") };
  const row = id ? await db.testimonial.update({ where: { id }, data }) : await db.testimonial.create({ data });
  await audit(user, id ? "testimonial.update" : "testimonial.create", "testimonial", row.id, { name: data.nameEn }, `${user.name} ${id ? "edited" : "added"} a testimonial from ${data.nameEn}`);
  done();
}
export async function deleteTestimonial(fd: FormData) {
  const user = await requireStaff("banners.manage");
  const x = await db.testimonial.findUnique({ where: { id: s(fd, "id") } });
  await db.testimonial.delete({ where: { id: s(fd, "id") } });
  await audit(user, "testimonial.delete", "testimonial", s(fd, "id"), { name: x?.nameEn }, `${user.name} deleted the testimonial from ${x?.nameEn ?? s(fd, "id")}`, { level: "warn" });
  done();
}

// ───────── pages ─────────
export async function savePage(fd: FormData) {
  const user = await requireStaff("pages.manage");
  const id = s(fd, "id");
  const titleEn = s(fd, "titleEn");
  if (!titleEn) return;
  const data = { titleEn, titleAr: s(fd, "titleAr"), bodyEn: String(fd.get("bodyEn") ?? "").slice(0, 30000), bodyAr: String(fd.get("bodyAr") ?? "").slice(0, 30000), published: b(fd, "published"), inFooter: b(fd, "inFooter"), sortOrder: n(fd, "sortOrder") };
  let pageId = id;
  const ch: string[] = [];
  if (id) {
    const old = await db.page.findUnique({ where: { id } });
    await db.page.update({ where: { id }, data: { ...data, ...(s(fd, "slug") ? { slug: slugify(s(fd, "slug")) } : {}) } });
    if (old) {
      if (old.titleEn !== titleEn) ch.push(change("title", old.titleEn, titleEn));
      if (old.published !== data.published) ch.push(data.published ? "published" : "unpublished");
      if (old.bodyEn !== data.bodyEn || old.bodyAr !== data.bodyAr) ch.push("text changed");
    }
  } else {
    let slug = slugify(s(fd, "slug") || titleEn) || "page";
    for (let i = 2; await db.page.findUnique({ where: { slug } }); i++) slug = `${slugify(titleEn)}-${i}`;
    pageId = (await db.page.create({ data: { ...data, slug } })).id;
  }
  await audit(user, id ? "page.update" : "page.create", "page", pageId, { title: titleEn, changes: ch }, `${user.name} ${id ? "edited" : "created"} page "${titleEn}"${ch.length ? ": " + ch.join("; ") : ""}`);
  done();
}
export async function deletePage(fd: FormData) {
  const user = await requireStaff("pages.manage");
  const x = await db.page.findUnique({ where: { id: s(fd, "id") } });
  await db.page.delete({ where: { id: s(fd, "id") } });
  await audit(user, "page.delete", "page", s(fd, "id"), { title: x?.titleEn }, `${user.name} deleted page "${x?.titleEn ?? s(fd, "id")}"`, { level: "warn" });
  done();
}

// ───────── media ─────────
export async function deleteMedia(fd: FormData) {
  const user = await requireStaff("media.manage");
  const id = s(fd, "id");
  const m = await db.mediaAsset.findUnique({ where: { id } });
  if (!m) return;
  const inUse = await db.productImage.count({ where: { path: m.path } });
  if (inUse === 0) {
    const { deleteImageFile } = await import("@/lib/uploads");
    await deleteImageFile(m.path);
    await db.mediaAsset.delete({ where: { id } });
    await audit(user, "media.delete", "media", id, { name: m.name, path: m.path }, `${user.name} deleted image "${m.name}"`);
  } else {
    await audit(user, "media.delete.blocked", "media", id, { name: m.name, usedBy: inUse }, `${user.name} tried to delete image "${m.name}" but it is used by ${inUse} product photo(s)`, { level: "warn" });
  }
  done();
}

// ───────── contact messages ─────────
export async function markMessageRead(fd: FormData) {
  const user = await requireStaff("messages.view");
  const m = await db.contactMessage.update({ where: { id: s(fd, "id") }, data: { read: true } });
  await audit(user, "message.read", "message", m.id, { from: m.name }, `${user.name} marked the message from ${m.name} as read`);
  done();
}
export async function deleteMessage(fd: FormData) {
  const user = await requireStaff("messages.view");
  const m = await db.contactMessage.findUnique({ where: { id: s(fd, "id") } });
  await db.contactMessage.delete({ where: { id: s(fd, "id") } });
  await audit(user, "message.delete", "message", s(fd, "id"), { from: m?.name, phone: m?.phone }, `${user.name} deleted the message from ${m?.name ?? s(fd, "id")}`, { level: "warn" });
  done();
}

// ───────── inventory ─────────
export async function setStock(fd: FormData) {
  const user = await requireStaff("stock.update");
  const id = s(fd, "id");
  const stock = Math.max(0, Math.floor(n(fd, "stock")));
  const v = await db.variant.findUniqueOrThrow({ where: { id }, include: { product: true, size: true, option: true } });
  if (v.stock === stock) return;
  const reason = s(fd, "reason") || "Manual adjustment";
  await db.$transaction([
    db.variant.update({ where: { id }, data: { stock } }),
    db.stockLog.create({ data: { variantId: id, delta: stock - v.stock, reason, userName: user.name } }),
  ]);
  const lab = [v.size?.labelEn, v.option?.labelEn].filter(Boolean).join("/");
  await audit(user, "stock.set", "variant", id, { product: v.product.nameEn, variant: lab, from: v.stock, to: stock, reason }, `${user.name} changed stock of "${v.product.nameEn}"${lab ? ` (${lab})` : ""}: ${v.stock} → ${stock} — ${reason}`, { level: stock === 0 ? "warn" : "info" });
  done();
}
