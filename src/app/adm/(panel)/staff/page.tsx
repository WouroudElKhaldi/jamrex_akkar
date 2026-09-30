import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { PERMISSIONS } from "@/lib/permissions";
import { deleteStaff } from "@/actions/admin/staff";
import { resetStaffTotp } from "@/actions/admin/security";
import { PageHeader } from "@/components/admin/bits";
import { DataTable, StatusDot, Thumb, type Row } from "@/components/admin/data-table";
import { MiniStats } from "@/components/admin/mini-stats";
import { StaffForm } from "@/components/admin/staff-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("staff.manage");
  const { t } = await adminT();
  const users = await db.user.findMany({ where: { hidden: false, ...(me.isOwner ? {} : { isOwner: false }) }, orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }], include: { permissions: true } });
  const canPerms = can(me, "permissions.manage");
  const actorPerms = [...me.perms];

  const rows: Row[] = users.map((u) => {
    const count = u.isOwner ? PERMISSIONS.length : u.permissions.length;
    return {
      id: u.id,
      title: u.name,
      subtitle: u.email,
      search: `${u.name} ${u.email}`,
      sort: { name: u.name, perms: count, twofa: u.totpEnabled ? 1 : 0, active: u.active ? 1 : 0 },
      cells: {
        name: (
          <div className="flex items-center gap-3">
            <Thumb letter={u.name} className="rounded-full" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">{u.name} {u.isOwner && <Badge tone="warn">{t("a.owner")}</Badge>} {u.id === me.id && <Badge tone="muted">{t("a.you")}</Badge>}</p>
              <p className="text-xs font-normal text-muted" dir="ltr">{u.email}</p>
            </div>
          </div>
        ),
        perms: (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${Math.min(100, (count / PERMISSIONS.length) * 100)}%` }} /></div>
            <span className="text-xs font-semibold text-muted">{count}/{PERMISSIONS.length}</span>
          </div>
        ),
        twofa: u.totpEnabled ? <Badge tone="ok">2FA</Badge> : <Badge tone="warn">no 2FA</Badge>,
        active: <StatusDot on={u.active} onLabel={t("a.active")} offLabel={t("a.inactive")} />,
      },
      editor: (
        <StaffForm
          key={[u.id, u.name, u.email, u.active, u.permissions.map((p) => p.key).sort().join(",")].join("|")}
          staff={{ id: u.id, name: u.name, email: u.email, active: u.active, isOwner: u.isOwner, perms: u.permissions.map((p) => p.key) }}
          canEditPerms={canPerms}
          actorPerms={actorPerms}
          actorIsOwner={me.isOwner}
          isSelf={u.id === me.id}
        />
      ),
      actions: (
        <>
          {u.totpEnabled && u.id !== me.id && (!u.isOwner || me.isOwner) && <form action={resetStaffTotp}><input type="hidden" name="id" value={u.id} /><ConfirmButton message={t("a.reset2faConfirm")} label={t("a.reset2fa")} icon={false} /></form>}
          {!u.isOwner && u.id !== me.id && <form action={deleteStaff}><input type="hidden" name="id" value={u.id} /><ConfirmButton message={t("a.confirmDelete")} /></form>}
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader title={t("a.staff")} subtitle={t("a.staffHelp")} icon={ShieldCheck} />
      <MiniStats stats={[
        { label: t("a.staff"), value: users.length },
        { label: t("a.active"), value: users.filter((u) => u.active).length, tone: "ok" },
        { label: "2FA", value: users.filter((u) => u.totpEnabled).length, tone: "accent" },
        { label: "no 2FA", value: users.filter((u) => !u.totpEnabled).length, tone: "warn" },
      ]} />
      <DataTable
        wide
        rows={rows}
        columns={[
          { key: "name", label: t("a.name"), sortable: true },
          { key: "perms", label: t("a.permsCount"), sortable: true, hideOnMobile: true },
          { key: "twofa", label: t("a.twofa"), sortable: true, hideOnMobile: true },
          { key: "active", label: t("a.status"), sortable: true },
        ]}
        createLabel={t("a.newStaff")}
        createEditor={<StaffForm staff={{ name: "", email: "", active: true, isOwner: false, perms: [] }} canEditPerms={canPerms} actorPerms={actorPerms} actorIsOwner={me.isOwner} isSelf={false} />}
      />
    </>
  );
}
