import type { BulkConfig } from "@/components/admin/data-table";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** The buttons of the bulk-action bar for each table (labels in the staff member's language). */
export function bulkOps(t: T, table: "product" | "category" | "banner" | "testimonial" | "offer" | "zone" | "page" | "media"): BulkConfig {
  const on = { op: "activate", label: t("a.bkActivate") };
  const off = { op: "deactivate", label: t("a.bkDeactivate") };
  const show = { op: "show", label: t("a.bkShow") };
  const hide = { op: "hide", label: t("a.bkHide") };
  const del = { op: "delete", label: t("a.delete"), tone: "danger" as const, confirm: t("a.bkConfirmDelete") };
  const ops = {
    product: [on, off, { op: "feature", label: t("a.bkFeature") }, { op: "unfeature", label: t("a.bkUnfeature") }],
    category: [show, hide],
    banner: [on, off, del],
    testimonial: [show, hide, del],
    offer: [on, off],
    zone: [on, off],
    page: [on, off, del],
    media: [del],
  }[table];
  return { table, ops };
}
