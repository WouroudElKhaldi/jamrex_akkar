import { Image as ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate, imageUrl } from "@/lib/utils";
import { deleteMedia } from "@/actions/admin/content";
import { bulkOps } from "@/lib/bulk-ops";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, Thumb, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CopyButton } from "@/components/admin/copy-button";
import { MediaUploader } from "@/components/admin/media-uploader";

export const metadata = { title: "Media" };

const PAGE = 40;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("media.manage");
  const { t, locale } = await adminT();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" as const } }, { path: { contains: sp.q, mode: "insensitive" as const } }] } : {};
  const weekAgo = Date.now() - 7 * 86400_000;
  const [items, total, recent] = await Promise.all([
    db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.mediaAsset.count({ where }),
    db.mediaAsset.count({ where: { createdAt: { gt: new Date(weekAgo) } } }),
  ]);

  const rows: Row[] = items.map((m) => {
    const url = imageUrl(m.path);
    return {
      id: m.id,
      title: m.name,
      subtitle: m.path,
      search: `${m.name} ${m.path}`,
      sort: { file: m.name, date: m.createdAt.getTime() },
      cells: {
        file: <div className="flex items-center gap-3"><Thumb src={imageUrl(m.path, "sm")} /><p className="max-w-xs truncate" dir="ltr" title={m.name}>{m.name}</p></div>,
        path: <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs" dir="ltr">{m.path}</span>,
        date: <span className="text-muted">{formatDate(m.createdAt, locale)}</span>,
      },
      editor: (
        <div className="space-y-5">
          <div className="flex justify-center rounded-2xl border border-border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="max-h-[55vh] max-w-full object-contain" />
          </div>
          <div className="space-y-1 text-sm"><p className="font-bold" dir="ltr">{m.name}</p><p className="text-muted" dir="ltr">{m.path}</p><p className="text-muted">{formatDate(m.createdAt, locale)}</p></div>
          <div className="flex flex-wrap gap-2"><CopyButton path={url} /></div>
        </div>
      ),
      actions: <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>,
    };
  });

  return (
    <>
      <PageHeader title={t("a.media")} icon={ImageIcon}><MediaUploader /></PageHeader>
      <MiniStats stats={[
        { label: t("a.media"), value: await db.mediaAsset.count() },
        { label: t("a.date"), value: recent, tone: "accent" },
      ]} />
      <DataTable
        bulk={bulkOps(t, "media")}
        paging={{ page, pages: Math.max(1, Math.ceil(total / PAGE)), total, q: sp.q }}
        rows={rows}
        editLabel={t("a.view")}
        columns={[
          { key: "file", label: t("a.file"), sortable: true },
          { key: "path", label: t("a.link"), hideOnMobile: true },
          { key: "date", label: t("a.date"), sortable: true },
        ]}
      />
    </>
  );
}
