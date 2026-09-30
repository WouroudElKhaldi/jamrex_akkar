import Link from "next/link";
import { db } from "@/lib/db";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { pick } from "@/lib/utils";
import { setStock } from "@/actions/admin/content";
import { Empty, PageHeader, TableWrap, tableCls, tdCls, thCls } from "@/components/admin/bits";
import { SaveForm } from "@/components/admin/save-form";
import { Badge, Input, Select } from "@/components/ui";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await requireStaff("stock.update");
  const sp = await searchParams;
  const { t, locale } = await adminT();
  const base = adminBase();

  const variants = await db.variant.findMany({
    where: {
      ...(sp.low ? { stock: { lte: 5 } } : {}),
      ...(sp.q ? { product: { OR: [{ nameEn: { contains: sp.q, mode: "insensitive" } }, { nameAr: { contains: sp.q, mode: "insensitive" } }] } } : {}),
    },
    include: { product: true, size: true, option: true },
    orderBy: [{ stock: "asc" }, { product: { nameEn: "asc" } }],
    take: 300,
  });

  return (
    <>
      <PageHeader title={t("a.inventory")} />
      <form className="mb-5 flex flex-wrap gap-2">
        <Input name="q" defaultValue={sp.q} placeholder={t("a.search")} className="max-w-64" />
        <Select name="low" defaultValue={sp.low ?? ""} className="w-auto">
          <option value="">{t("a.all")}</option>
          <option value="1">{t("a.lowStock")}</option>
        </Select>
        <button className="rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-2">{t("a.filter")}</button>
      </form>
      {variants.length === 0 ? <Empty>{t("a.noData")}</Empty> : (
        <TableWrap>
          <table className={tableCls}>
            <thead><tr><th className={thCls}>{t("a.products")}</th><th className={thCls}>{t("a.stock")}</th><th className={thCls}>{t("a.setStock")}</th></tr></thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-surface-2/50">
                  <td className={tdCls}>
                    <Link href={`${base}/products/${v.productId}`} className="font-semibold text-brand">{pick(locale, v.product.nameEn, v.product.nameAr)}</Link>
                    <span className="block text-xs text-muted">{[v.size && pick(locale, v.size.labelEn, v.size.labelAr), v.option && pick(locale, v.option.labelEn, v.option.labelAr)].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className={tdCls}><Badge tone={v.stock === 0 ? "danger" : v.stock <= 5 ? "warn" : "ok"}>{v.stock}</Badge></td>
                  <td className={tdCls}>
                    <SaveForm action={setStock} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={v.id} />
                      <Input name="stock" type="number" min={0} defaultValue={v.stock} className="h-9 w-24" />
                      <Input name="reason" placeholder={t("a.reason")} className="h-9 w-40" />
                    </SaveForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
