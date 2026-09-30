import { CheckCircle2, XCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { getSiteContent } from "@/lib/content";
import { channelStatus, emailProvider } from "@/lib/notify";
import { saveEmailSettings } from "@/actions/admin/settings";
import { PageHeader } from "@/components/admin/bits";
import { PushPanel } from "@/components/admin/push-panel";
import { TelegramFinder } from "@/components/admin/telegram-finder";
import { SaveForm } from "@/components/admin/save-form";
import { Card, Switch } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff("settings.manage");
  const { t } = await adminT();
  const c = await getSiteContent();
  const ch = channelStatus();
  const rows = [
    { label: t("a.telegram"), ok: ch.telegram },
    { label: t("a.email"), ok: ch.email },
    { label: t("a.webpush"), ok: ch.push },
    { label: t("a.whish"), ok: ch.whish },
  ];

  return (
    <>
      <PageHeader title={t("a.settings")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-bold">{t("a.pmEmailTitle")}</h2>
          <p className="text-sm text-muted">{emailProvider() === "resend" ? "Resend" : emailProvider() === "smtp" ? "SMTP" : t("a.notConfigured")} · {t("a.pmEmailHelp")}</p>
          <SaveForm action={saveEmailSettings}>
            <Switch name="orderConfirm" defaultChecked={c.on("email.orderConfirm.enabled")} label={t("a.pmOrderConfirm")} />
            <p className="mt-2 text-xs text-muted">{t("a.pmOrderConfirmHelp")}</p>
          </SaveForm>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-bold">{t("a.channels")}</h2>
          <ul className="space-y-2.5 text-sm">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
                <span className="font-semibold">{r.label}</span>
                <span className={`inline-flex items-center gap-1.5 ${r.ok ? "text-ok" : "text-muted"}`}>{r.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{r.ok ? t("a.configured") : t("a.notConfigured")}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold">Telegram</h2>
          <TelegramFinder />
        </Card>

        <Card className="space-y-4 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold">{t("a.notifications")}</h2>
          <PushPanel vapidPublicKey={process.env.VAPID_PUBLIC_KEY || ""} canTest />
        </Card>
      </div>
    </>
  );
}
