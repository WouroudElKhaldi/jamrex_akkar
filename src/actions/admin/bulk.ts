"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requireStaff } from "@/lib/auth";
import { bustMemo } from "@/lib/memo";

type Delegate = {
  updateMany: (a: { where: { id: { in: string[] } }; data: Record<string, unknown> }) => Promise<{ count: number }>;
  update: (a: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  deleteMany: (a: { where: { id: { in: string[] } } }) => Promise<{ count: number }>;
};

/** What each table may be bulk-changed with. The permission is checked on the server for every call. */
const TABLES: Record<string, { perm: string; model: string; label: string; set: Record<string, Record<string, unknown>>; del?: boolean; sortable?: boolean }> = {
  product: { perm: "products.edit", model: "product", label: "products", set: { activate: { active: true }, deactivate: { active: false }, feature: { featured: true }, unfeature: { featured: false } } },
  category: { perm: "categories.manage", model: "category", label: "categories", set: { show: { visible: true }, hide: { visible: false } }, sortable: true },
  banner: { perm: "banners.manage", model: "banner", label: "banners", set: { activate: { active: true }, deactivate: { active: false } }, del: true, sortable: true },
  testimonial: { perm: "banners.manage", model: "testimonial", label: "testimonials", set: { show: { visible: true }, hide: { visible: false } }, del: true, sortable: true },
  offer: { perm: "offers.manage", model: "offer", label: "offers", set: { activate: { active: true }, deactivate: { active: false } } },
  zone: { perm: "delivery.manage", model: "deliveryZone", label: "delivery zones", set: { activate: { active: true }, deactivate: { active: false } }, sortable: true },
  page: { perm: "pages.manage", model: "page", label: "pages", set: { activate: { published: true }, deactivate: { published: false } }, del: true, sortable: true },
  media: { perm: "media.manage", model: "mediaAsset", label: "images", set: {}, del: true },
};

const cleanIds = (ids: unknown) => (Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 40))].slice(0, 200) : []);
const delegate = (model: string) => (db as unknown as Record<string, Delegate>)[model];
const refresh = () => {
  bustMemo();
  revalidatePath("/adm", "layout");
  revalidatePath("/", "layout");
};

export async function bulkRun(table: string, op: string, rawIds: string[]): Promise<{ ok: boolean; count: number }> {
  const cfg = TABLES[table];
  if (!cfg) return { ok: false, count: 0 };
  const user = await requireStaff(cfg.perm);
  const ids = cleanIds(rawIds);
  if (ids.length === 0) return { ok: false, count: 0 };
  const d = delegate(cfg.model);
  let count = 0;

  if (op === "delete" && cfg.del) {
    if (table === "media") {
      // an image that a product still uses is never deleted
      const { deleteImageFile } = await import("@/lib/uploads");
      const items = await db.mediaAsset.findMany({ where: { id: { in: ids } } });
      for (const m of items) {
        if ((await db.productImage.count({ where: { path: m.path } })) > 0) continue;
        await deleteImageFile(m.path);
        await db.mediaAsset.delete({ where: { id: m.id } });
        count++;
      }
    } else {
      count = (await d.deleteMany({ where: { id: { in: ids } } })).count;
    }
  } else if (cfg.set[op]) {
    count = (await d.updateMany({ where: { id: { in: ids } }, data: cfg.set[op] })).count;
  } else {
    return { ok: false, count: 0 };
  }

  await audit(user, `bulk.${table}.${op}`, table, undefined, { count, ids }, `${user.name} ran "${op}" on ${count} ${cfg.label} at once`, { level: op === "delete" ? "warn" : "info" });
  refresh();
  return { ok: true, count };
}

/** Saves a drag-and-drop order: the row at position i gets sortOrder i*10. */
export async function reorderRows(table: string, rawIds: string[]): Promise<void> {
  const cfg = TABLES[table];
  if (!cfg?.sortable) return;
  const user = await requireStaff(cfg.perm);
  const ids = cleanIds(rawIds);
  const d = delegate(cfg.model);
  await db.$transaction(ids.map((id, i) => d.update({ where: { id }, data: { sortOrder: i * 10 } }) as never));
  await audit(user, `reorder.${table}`, table, undefined, { count: ids.length }, `${user.name} changed the order of ${cfg.label}`);
  refresh();
}
