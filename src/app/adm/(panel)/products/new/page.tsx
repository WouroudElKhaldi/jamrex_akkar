import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { pick } from "@/lib/utils";
import { PageHeader } from "@/components/admin/bits";
import { ProductEditor, type EditorInit } from "@/components/admin/product-editor";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireStaff("products.edit");
  const { t, locale } = await adminT();
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const init: EditorInit = {
    slug: "", nameEn: "", nameAr: "", shortEn: "", shortAr: "", descEn: "", descAr: "",
    active: true, featured: false, isNew: false, optionKind: "SCENT", sortOrder: 0,
    categoryIds: [], images: [], sizes: [], options: [],
    variants: [{ sizeKey: null, optionKey: null, sku: "", price: 0, compareAt: null, stock: 0, active: true }],
  };
  return (
    <>
      <PageHeader title={t("a.newProduct")} />
      <ProductEditor init={init} categories={cats.map((c) => ({ id: c.id, name: pick(locale, c.nameEn, c.nameAr) }))} perms={{ edit: true, price: true, stock: true }} />
    </>
  );
}
