"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Card, Field, Input, Spinner, Switch } from "@/components/ui";
import { useDrawerClose } from "./data-table";
import { saveStaff, type StaffState } from "@/actions/admin/staff";
import { PERMISSIONS, PERM_GROUPS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Staff = { id?: string; name: string; email: string; active: boolean; isOwner: boolean; perms: string[] };

const ERR: Record<string, string> = {
  invalid: "a.failed", email: "a.emailUsed", password: "a.passwordShort", passwordWeak: "a.passwordWeak", owner: "a.cannotEditOwner", self: "a.cannotDisableSelf", notfound: "a.failed",
};

/** One employee: identity + a checkbox matrix of individually granted permissions. */
export function StaffForm({ staff, canEditPerms, actorPerms, actorIsOwner, isSelf }: { staff: Staff; canEditPerms: boolean; actorPerms: string[]; actorIsOwner: boolean; isSelf: boolean }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState<StaffState, FormData>(saveStaff, null);
  const [sel, setSel] = useState<Set<string>>(new Set(staff.perms));
  // React resets the <form> after an action: for the "new employee" form also clear the ticked boxes
  const closeDrawer = useDrawerClose();
  useEffect(() => {
    if (!state?.ok) return;
    if (!staff.id) setSel(new Set());
    if (closeDrawer) { const id = setTimeout(closeDrawer, 750); return () => clearTimeout(id); }
  }, [state, staff.id, closeDrawer]);
  const grantable = (k: string) => actorIsOwner || actorPerms.includes(k);
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const setGroup = (keys: string[], on: boolean) => setSel((s) => { const n = new Set(s); keys.filter(grantable).forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });

  const readOnly = staff.isOwner && !actorIsOwner;

  return (
    <form action={action} className="space-y-6">
      {staff.id && <input type="hidden" name="id" value={staff.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("a.name")}><Input name="name" defaultValue={staff.name} required disabled={readOnly} /></Field>
        <Field label={t("a.email")}><Input name="email" type="email" defaultValue={staff.email} required dir="ltr" disabled={readOnly} /></Field>
        <Field label={staff.id ? t("a.newPassword") : t("a.password")}><Input name="password" type="password" minLength={12} autoComplete="new-password" required={!staff.id} disabled={readOnly} /></Field>
        <div className="flex items-end">{staff.isOwner ? <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand">{t("a.owner")}</span> : <Switch name="active" defaultChecked={staff.active} label={t("a.active")} />}</div>
      </div>
      {isSelf && !staff.isOwner && <input type="hidden" name="active" value="1" />}

      {!staff.isOwner && canEditPerms && (
        <div>
          <h3 className="mb-1 font-bold">{t("a.permissionsTitle")}</h3>
          <p className="mb-4 text-sm text-muted">{t("a.staffHelp")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(PERM_GROUPS).map(([gid, g]) => {
              const items = PERMISSIONS.filter((p) => p.group === gid);
              const all = items.every((p) => sel.has(p.key));
              const some = items.some((p) => sel.has(p.key));
              return (
                <Card key={gid} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-bold">{g[locale]}</span>
                    <button type="button" onClick={() => setGroup(items.map((i) => i.key), !all)} className="text-xs font-semibold text-brand hover:underline">{all ? t("a.clearAll") : t("a.selectAll")}</button>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((p) => {
                      const on = sel.has(p.key);
                      const ok = grantable(p.key);
                      return (
                        <li key={p.key}>
                          <label className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition", ok ? "cursor-pointer hover:bg-surface-2" : "cursor-not-allowed opacity-50")}>
                            <input type="checkbox" name={`perm:${p.key}`} value="1" checked={on} disabled={!ok} onChange={() => toggle(p.key)} className="peer sr-only" />
                            <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border-2 transition", on ? "border-brand bg-brand text-brand-fg" : "border-border")}>{on && <Check className="h-3.5 w-3.5" />}</span>
                            {p[locale]}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {!all && some && <Minus className="hidden" />}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || readOnly}>{pending && <Spinner />} {staff.id ? t("a.save") : t("a.create")}</Button>
        {state?.ok && <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok"><Check className="h-4 w-4" /> {t("a.saved")}</span>}
        {state?.error && <span className="text-sm font-semibold text-danger">{t(ERR[state.error] || "a.failed")}</span>}
      </div>
    </form>
  );
}
