"use server";

import { bustMemo } from "@/lib/memo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminBase, audit, can, requireStaff } from "@/lib/auth";
import { change } from "@/lib/audit";
import { num, slugify } from "@/lib/utils";
import { editorSchema, type SaveResult } from "@/lib/product-schema";

export async function saveProduct(raw: unknown): Promise<SaveResult> {
  const user = await requireStaff();
  const parsed = editorSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message };
  const p = parsed.data;

  const full = can(user, "products.edit");
  const canPrice = can(user, "prices.edit") || full;
  const canStock = can(user, "stock.update") || full;
  if (!full && !(canPrice || canStock)) return { ok: false, error: "forbidden" };

  // ── Limited editors: only prices / stock of existing variants ──
  if (!full) {
    if (!p.id) return { ok: false, error: "forbidden" };
    const canP = can(user, "prices.edit");
    const canS = can(user, "stock.update");
    const prev = await db.variant.findMany({ where: { id: { in: p.variants.filter((v) => v.id).map((v) => v.id!) } }, include: { size: true, option: true, product: { select: { nameEn: true } } } });
    const limited: string[] = [];
    for (const v of p.variants) {
      const o = prev.find((x) => x.id === v.id);
      if (!o) continue;
      const lab = [o.size?.labelEn, o.option?.labelEn].filter(Boolean).join("/") || "default";
      if (canP && num(o.price) !== v.price) limited.push(change(`price ${lab}`, `$${num(o.price)}`, `$${v.price}`));
      if (canS && o.stock !== v.stock) limited.push(change(`stock ${lab}`, o.stock, v.stock));
    }
    await db.$transaction(
      p.variants
        .filter((v) => v.id)
        .map((v) =>
          db.variant.update({
            where: { id: v.id! },
            data: { ...(canP ? { price: v.price, compareAtPrice: v.compareAt } : {}), ...(canS ? { stock: v.stock } : {}) },
          }),
        ),
    );
    const pname = prev[0]?.product.nameEn ?? p.nameEn;
    await audit(user, "product.limited-edit", "product", p.id, { name: pname, changes: limited }, `${user.name} changed prices/stock of "${pname}"${limited.length ? ": " + limited.join("; ") : " (no changes)"}`);
    revalidatePath("/adm", "layout");
    revalidatePath("/", "layout");
  bustMemo();
    return { ok: true, id: p.id };
  }

  const existing = p.id ? await db.product.findUnique({ where: { id: p.id }, include: { variants: true } }) : null;
  if (p.id && !existing) return { ok: false, error: "not found" };

  // unique slug
  let slug = slugify(p.slug || p.nameEn) || "product";
  for (let i = 2; await db.product.findFirst({ where: { slug, ...(p.id ? { NOT: { id: p.id } } : {}) }, select: { id: true } }); i++) {
    slug = `${slugify(p.slug || p.nameEn) || "product"}-${i}`;
  }

  // everything that changed, for the activity log
  const changes: string[] = [];
  if (existing) {
    if (existing.nameEn !== p.nameEn) changes.push(change("name", existing.nameEn, p.nameEn));
    if (existing.nameAr !== p.nameAr) changes.push("Arabic name changed");
    if (existing.active !== p.active) changes.push(p.active ? "product shown on the shop" : "product hidden from the shop");
    if (existing.featured !== p.featured) changes.push(p.featured ? "marked featured" : "removed from featured");
    if (existing.isNew !== p.isNew) changes.push(p.isNew ? "marked new" : "unmarked new");
    if (existing.descEn !== p.descEn || existing.descAr !== p.descAr || existing.shortEn !== p.shortEn || existing.shortAr !== p.shortAr) changes.push("description changed");
  }
  const vlabel = (sizeKey: string | null, optionKey: string | null) =>
    [sizeKey && p.sizes.find((s) => s.key === sizeKey)?.labelEn, optionKey && p.options.find((o) => o.key === optionKey)?.labelEn].filter(Boolean).join("/") || "default";

  const id = await db.$transaction(
    async (tx) => {
      const data = {
        slug,
        nameEn: p.nameEn, nameAr: p.nameAr, shortEn: p.shortEn, shortAr: p.shortAr, descEn: p.descEn, descAr: p.descAr,
        active: p.active, featured: p.featured, isNew: p.isNew, optionKind: p.optionKind, sortOrder: p.sortOrder,
      };
      const prod = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data });

      // categories
      await tx.productCategory.deleteMany({ where: { productId: prod.id } });
      if (p.categoryIds.length) await tx.productCategory.createMany({ data: p.categoryIds.map((categoryId) => ({ productId: prod.id, categoryId })) });

      // images
      const imgKeep = p.images.filter((i) => i.id).map((i) => i.id!);
      await tx.productImage.deleteMany({ where: { productId: prod.id, id: { notIn: imgKeep } } });
      const imgMap = new Map<string, string>();
      for (const [idx, im] of p.images.entries()) {
        if (im.id) {
          await tx.productImage.update({ where: { id: im.id }, data: { alt: im.alt, sortOrder: idx } });
          imgMap.set(im.key, im.id);
        } else {
          const c = await tx.productImage.create({ data: { productId: prod.id, path: im.path, alt: im.alt, sortOrder: idx } });
          imgMap.set(im.key, c.id);
        }
      }

      // sizes
      await tx.productSize.deleteMany({ where: { productId: prod.id, id: { notIn: p.sizes.filter((s) => s.id).map((s) => s.id!) } } });
      const sizeMap = new Map<string, string>();
      for (const [idx, s] of p.sizes.entries()) {
        if (s.id) {
          await tx.productSize.update({ where: { id: s.id }, data: { labelEn: s.labelEn, labelAr: s.labelAr, sortOrder: idx } });
          sizeMap.set(s.key, s.id);
        } else {
          const c = await tx.productSize.create({ data: { productId: prod.id, labelEn: s.labelEn, labelAr: s.labelAr, sortOrder: idx } });
          sizeMap.set(s.key, c.id);
        }
      }

      // options
      await tx.productOption.deleteMany({ where: { productId: prod.id, id: { notIn: p.options.filter((o) => o.id).map((o) => o.id!) } } });
      const optMap = new Map<string, string>();
      for (const [idx, o] of p.options.entries()) {
        const d = { labelEn: o.labelEn, labelAr: o.labelAr, swatch: o.swatch || null, imageId: o.imageKey ? imgMap.get(o.imageKey) ?? null : null, sortOrder: idx };
        if (o.id) {
          await tx.productOption.update({ where: { id: o.id }, data: d });
          optMap.set(o.key, o.id);
        } else {
          const c = await tx.productOption.create({ data: { productId: prod.id, ...d } });
          optMap.set(o.key, c.id);
        }
      }

      // variants
      const old = existing?.variants ?? [];
      const keepIds = new Set<string>();
      for (const v of p.variants) {
        const sizeId = v.sizeKey ? sizeMap.get(v.sizeKey) ?? null : null;
        const optionId = v.optionKey ? optMap.get(v.optionKey) ?? null : null;
        if ((v.sizeKey && !sizeId) || (v.optionKey && !optionId)) continue;
        const match = (v.id && old.find((o) => o.id === v.id)) || old.find((o) => o.sizeId === sizeId && o.optionId === optionId);
        const price = match && !canPrice ? match.price : v.price;
        const compare = match && !canPrice ? match.compareAtPrice : v.compareAt;
        const stock = match && !canStock ? match.stock : v.stock;
        const d = { sizeId, optionId, sku: v.sku || null, price, compareAtPrice: compare, stock, active: v.active };
        const lab = vlabel(v.sizeKey, v.optionKey);
        if (match) {
          if (num(match.price) !== num(price)) changes.push(change(`price ${lab}`, `$${num(match.price)}`, `$${num(price)}`));
          if (num(match.compareAtPrice) !== num(compare)) changes.push(change(`old price ${lab}`, match.compareAtPrice ? `$${num(match.compareAtPrice)}` : null, compare ? `$${num(compare)}` : null));
          if (stock !== match.stock) changes.push(change(`stock ${lab}`, match.stock, stock));
          if (match.active !== v.active) changes.push(`${lab} ${v.active ? "enabled" : "disabled"}`);
          if (stock !== match.stock) await tx.stockLog.create({ data: { variantId: match.id, delta: stock - match.stock, reason: "Manual edit", userName: user.name } });
          await tx.variant.update({ where: { id: match.id }, data: d });
          keepIds.add(match.id);
        } else {
          const c = await tx.variant.create({ data: { productId: prod.id, ...d } });
          if (existing) changes.push(`new variant ${lab} at $${num(price)} (stock ${stock})`);
          if (stock > 0) await tx.stockLog.create({ data: { variantId: c.id, delta: stock, reason: "Initial stock", userName: user.name } });
          keepIds.add(c.id);
        }
      }
      // variants of removed sizes/options cascade; delete any other leftovers
      for (const gone of old.filter((o) => !keepIds.has(o.id))) changes.push(`variant removed (was $${num(gone.price)}, stock ${gone.stock})`);
      await tx.variant.deleteMany({ where: { productId: prod.id, id: { notIn: [...keepIds] } } });
      return prod.id;
    },
    { timeout: 30_000 },
  );

  await audit(
    user,
    existing ? "product.update" : "product.create",
    "product",
    id,
    { name: p.nameEn, changes, variants: p.variants.length, sizes: p.sizes.length, options: p.options.length, images: p.images.length },
    existing
      ? `${user.name} edited product "${p.nameEn}"${changes.length ? ": " + changes.slice(0, 8).join("; ") + (changes.length > 8 ? ` (+${changes.length - 8} more)` : "") : " (saved, nothing changed)"}`
      : `${user.name} created product "${p.nameEn}" with ${p.variants.length} variant${p.variants.length === 1 ? "" : "s"}, ${p.images.length} photo${p.images.length === 1 ? "" : "s"}`,
  );
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
  bustMemo();
  return { ok: true, id };
}

export async function deleteProduct(fd: FormData) {
  const user = await requireStaff("products.delete");
  const id = String(fd.get("id"));
  const p = await db.product.findUnique({ where: { id }, select: { nameEn: true } });
  if (!p) return;
  await db.product.delete({ where: { id } });
  await audit(user, "product.delete", "product", id, { name: p.nameEn }, `${user.name} deleted product "${p.nameEn}"`, { level: "warn" });
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
  bustMemo();
  redirect(adminBase() + "/products");
}

export async function toggleProductActive(fd: FormData) {
  const user = await requireStaff("products.edit");
  const id = String(fd.get("id"));
  const p = await db.product.findUniqueOrThrow({ where: { id } });
  await db.product.update({ where: { id }, data: { active: !p.active } });
  await audit(user, "product.toggle", "product", id, { name: p.nameEn, active: !p.active }, `${user.name} ${!p.active ? "showed" : "hid"} product "${p.nameEn}" ${!p.active ? "on" : "from"} the shop`);
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
  bustMemo();
}
