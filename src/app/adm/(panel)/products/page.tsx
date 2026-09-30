import Link from "next/link";
import { Package, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { adminBase, can, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { imageUrl, money, num, pick } from "@/lib/utils";
import { toggleProductActive } from "@/actions/admin/products";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, Thumb, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { Badge, Button, Select } from "@/components/ui";

export const metadata = { title: "Products" };
const PAGE = 40;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; page?: string }> }) {
  const user = await requireStaff("products.view");
  const sp = await searchParams;
  const { t, locale } = await adminT();
  const base = adminBase();
  const page = Math.max(1, Number(sp.page) || 1);
  const canEdit = can(user, "products.edit");

  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.OR = [{ nameEn: { contains: sp.q, mode: "insensitive" } }, { nameAr: { contains: sp.q, mode: "insensitive" } }];
  if (sp.cat) where.categories = { some: { categoryId: sp.cat } };

  const [products, total, cats, activeCount, outCount] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, categories: { include: { category: true } } } }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.count({ where: { active: true } }),
    db.product.count({ where: { active: true, variants: { none: { stock: { gt: 0 } } } } }),
  ]);

  const rows: Row[] = products.map((p) => {
    const prices = p.variants.map((v) => num(v.price));
    const stock = p.variants.reduce((s, v) => s + v.stock, 0);
    const cat = p.categories.map((c) => pick(locale, c.category.nameEn, c.category.nameAr)).join(", ");
    const price = prices.length ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))} – ${money(Math.max(...prices))}`) : "—";
    return {
      id: p.id,
      title: p.nameEn,
      href: `${base}/products/${p.id}`,
      search: p.nameEn,
      sort: { name: p.nameEn, price: prices.length ? Math.min(...prices) : 0, stock },
      cells: {
        name: (
          <div className="flex items-center gap-3">
            <Thumb src={p.images[0] ? imageUrl(p.images[0].path, "sm") : undefined} letter={p.nameEn} />
            <div className="min-w-0">
              <p className="truncate">{p.nameEn}{p.featured && <span className="ms-2 text-warn" title={t("a.bkFeature")}>★</span>}</p>
              {p.nameAr && <p className="truncate text-xs font-normal text-muted" dir="rtl">{p.nameAr}</p>}
              <p className="text-xs font-normal text-muted">{p.variants.length} variants</p>
            </div>
          </div>
        ),
        cat: <span className="text-muted">{cat}</span>,
        price: <span className="font-bold">{price}</span>,
        stock: <Badge tone={stock === 0 ? "danger" : stock <= 5 ? "warn" : "ok"}>{stock}</Badge>,
        status: canEdit ? (
          <form action={toggleProductActive}><input type="hidden" name="id" value={p.id} /><button type="submit" title={p.active ? t("a.bkDeactivate") : t("a.bkActivate")}><StatusDot on={p.active} onLabel={t("a.active")} offLabel={t("a.inactive")} /></button></form>
        ) : <StatusDot on={p.active} onLabel={t("a.active")} offLabel={t("a.inactive")} />,
      },
    };
  });

  return (
    <>
      <PageHeader title={t("a.products")} icon={Package}>
        {canEdit && <Link href={`${base}/products/new`}><Button><Plus className="h-4 w-4" /> {t("a.newProduct")}</Button></Link>}
      </PageHeader>
      <MiniStats stats={[
        { label: t("a.products"), value: await db.product.count() },
        { label: t("a.active"), value: activeCount, tone: "ok" },
        { label: t("common.outOfStock"), value: outCount, tone: "danger" },
        { label: t("a.categories"), value: cats.length, tone: "accent" },
      ]} />
      <DataTable
        bulk={canEdit ? bulkOps(t, "product") : undefined}
        paging={{
          page,
          pages: Math.max(1, Math.ceil(total / PAGE)),
          total,
          q: sp.q,
          params: sp.cat ? { cat: sp.cat } : {},
          filters: (
            <Select name="cat" defaultValue={sp.cat ?? ""} className="w-auto">
              <option value="">{t("a.all")}</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{pick(locale, c.nameEn, c.nameAr)}</option>)}
            </Select>
          ),
        }}
        rows={rows}
        empty={t("a.noProducts")}
        columns={[
          { key: "name", label: t("a.name"), sortable: true },
          { key: "cat", label: t("a.categoriesLabel"), hideOnMobile: true },
          { key: "price", label: t("a.price"), sortable: true },
          { key: "stock", label: t("a.stock"), sortable: true },
          { key: "status", label: t("a.status") },
        ]}
      />
    </>
  );
}
