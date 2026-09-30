import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { num, pick } from "@/lib/utils";
import { deleteProduct } from "@/actions/admin/products";
import { PageHeader } from "@/components/admin/bits";
import { ProductEditor, type EditorInit } from "@/components/admin/product-editor";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("products.view");
  const { id } = await params;
  const { t, locale } = await adminT();
  const [p, cats] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { categories: true, images: { orderBy: { sortOrder: "asc" } }, sizes: { orderBy: { sortOrder: "asc" } }, options: { orderBy: { sortOrder: "asc" } }, variants: true },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!p) notFound();

  const imgKey = new Map(p.images.map((i) => [i.id, i.id]));
  const init: EditorInit = {
    id: p.id, slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, shortEn: p.shortEn, shortAr: p.shortAr, descEn: p.descEn, descAr: p.descAr,
    active: p.active, featured: p.featured, isNew: p.isNew, optionKind: p.optionKind as EditorInit["optionKind"], sortOrder: p.sortOrder,
    categoryIds: p.categories.map((c) => c.categoryId),
    images: p.images.map((i) => ({ key: i.id, id: i.id, path: i.path, alt: i.alt })),
    sizes: p.sizes.map((s) => ({ key: s.id, id: s.id, labelEn: s.labelEn, labelAr: s.labelAr })),
    options: p.options.map((o) => ({ key: o.id, id: o.id, labelEn: o.labelEn, labelAr: o.labelAr, swatch: o.swatch, imageKey: o.imageId ? imgKey.get(o.imageId) ?? null : null })),
    variants: p.variants.map((v) => ({ id: v.id, sizeKey: v.sizeId, optionKey: v.optionId, sku: v.sku ?? "", price: num(v.price), compareAt: v.compareAtPrice ? num(v.compareAtPrice) : null, stock: v.stock, active: v.active })),
  };

  return (
    <>
      <PageHeader title={p.nameEn} subtitle={t("a.editProduct")}>
        <Link href={`/${locale}/product/${p.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2"><ExternalLink className="h-4 w-4" /> {t("a.viewSite")}</Link>
        {can(user, "products.delete") && (
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={p.id} />
            <ConfirmButton message={t("a.confirmDelete")} label={t("a.deleteProduct")} />
          </form>
        )}
      </PageHeader>
      <ProductEditor
        key={p.updatedAt.toISOString() + p.variants.length + p.images.length}
        init={init}
        categories={cats.map((c) => ({ id: c.id, name: pick(locale, c.nameEn, c.nameAr) }))}
        perms={{ edit: can(user, "products.edit"), price: can(user, "prices.edit"), stock: can(user, "stock.update") }}
      />
    </>
  );
}
