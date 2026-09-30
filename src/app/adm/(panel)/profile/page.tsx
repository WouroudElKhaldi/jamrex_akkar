import Link from "next/link";
import { CalendarDays, Check, Crown, KeyRound, ShieldCheck, ShieldAlert, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { adminBase, requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { formatDate } from "@/lib/utils";
import { PERMISSIONS, PERM_GROUPS } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/bits";
import { MiniStats } from "@/components/admin/mini-stats";
import { ProfileForms } from "@/components/admin/profile-forms";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "My profile" };

// open to every signed-in employee
export default async function ProfilePage() {
  const me = await requireStaff();
  const { t, locale } = await adminT();
  const [u, recent, actions30] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { createdAt: true, totpEnabled: true, recoveryHashes: true } }),
    db.auditLog.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, summary: true, action: true, createdAt: true, level: true, ip: true } }),
    db.auditLog.count({ where: { userId: me.id, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
  ]);
  const mine = PERMISSIONS.filter((p) => me.isOwner || me.perms.has(p.key));
  const groups = Object.entries(PERM_GROUPS).map(([id, g]) => ({ id, label: g[locale], items: mine.filter((p) => p.group === id) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader title={t("a.profile")} subtitle={t("a.profileHelp")} icon={UserRound} />

      <Card className="relative mb-6 overflow-hidden">
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-brand via-[#3b6cf6] to-accent">
          <div className="absolute -top-10 start-1/4 h-40 w-40 animate-float-slow rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -top-6 end-16 h-28 w-28 animate-float-slow rounded-full bg-white/10 blur-xl [animation-delay:-3s]" />
        </div>
        <div className="flex flex-wrap items-end gap-5 px-6 pb-6">
          <span className="relative z-10 -mt-12 flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-surface bg-gradient-to-br from-brand to-accent text-4xl font-black text-white shadow-glow">{me.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1 pt-3">
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-black">{me.name} {me.isOwner && <Badge tone="warn"><Crown className="me-1 h-3 w-3" /> {t("a.owner")}</Badge>}</h2>
            <p className="text-sm text-muted" dir="ltr">{me.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted"><CalendarDays className="h-4 w-4" /> {t("a.memberSince")} {formatDate(u.createdAt, locale)}</div>
        </div>
      </Card>

      <MiniStats stats={[
        { label: t("a.permissionsTitle"), value: me.isOwner ? PERMISSIONS.length : me.perms.size, tone: "brand" },
        { label: t("a.actions30"), value: actions30, tone: "accent" },
        { label: t("a.recoveryLeft"), value: u.recoveryHashes.length, tone: u.totpEnabled ? "ok" : "warn" },
      ]} />

      <div className="mb-6">
        <ProfileForms name={me.name} email={me.email} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">{u.totpEnabled ? <ShieldCheck className="h-5 w-5 text-ok" /> : <ShieldAlert className="h-5 w-5 text-warn" />} 2FA</h2>
            <Badge tone={u.totpEnabled ? "ok" : "warn"}>{u.totpEnabled ? t("a.on") : t("a.off")}</Badge>
          </div>
          <p className="mb-4 text-sm text-muted">{u.totpEnabled ? t("a.twofaOnText") : t("a.twofaOffText")}</p>
          <Link href={`${adminBase()}/security`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-soft px-4 text-sm font-semibold text-brand transition hover:-translate-y-0.5 hover:shadow-card"><KeyRound className="h-4 w-4" /> {t("a.security")}</Link>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold">{t("a.recentActivity")}</h2>
          {recent.length === 0 ? <p className="text-sm text-muted">{t("a.noData")}</p> : (
            <ol className="relative space-y-4 border-s-2 border-border ps-5">
              {recent.map((r) => (
                <li key={r.id} className="relative">
                  <span className={`absolute -start-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-surface ${r.level === "warn" ? "bg-warn" : r.level === "error" ? "bg-danger" : "bg-brand"}`} />
                  <p className="text-sm" dir="auto">{r.summary || r.action}</p>
                  <p className="text-xs text-muted">{formatDate(r.createdAt, locale)}{r.ip ? ` · ${r.ip}` : ""}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-lg font-bold">{t("a.permissionsYou")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-border p-4">
              <p className="mb-2 font-bold">{g.label}</p>
              <ul className="space-y-1.5 text-sm">
                {g.items.map((p) => <li key={p.key} className="flex items-center gap-2 text-muted"><Check className="h-4 w-4 shrink-0 text-ok" /> {p[locale]}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
