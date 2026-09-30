import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate } from "@/lib/utils";
import { deleteMessage, markMessageRead } from "@/actions/admin/content";
import { Badge, Button, Card } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Empty, PageHeader } from "@/components/admin/bits";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireStaff("messages.view");
  const { t, locale } = await adminT();
  const msgs = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title={t("a.messages")} />
      {msgs.length === 0 ? <Empty>{t("a.noData")}</Empty> : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{m.name} {!m.read && <Badge tone="danger">{t("a.unread")}</Badge>}</p>
                <span className="text-xs text-muted">{formatDate(m.createdAt, locale)}</span>
              </div>
              <p className="whitespace-pre-line text-sm">{m.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <a href={`tel:${m.phone}`} dir="ltr" className="font-semibold text-brand">{m.phone}</a>
                {m.email && <a href={`mailto:${m.email}`} dir="ltr" className="text-muted">{m.email}</a>}
                <span className="ms-auto flex gap-2">
                  {!m.read && <form action={markMessageRead}><input type="hidden" name="id" value={m.id} /><Button size="sm" variant="outline" type="submit">{t("a.markRead")}</Button></form>}
                  <form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
