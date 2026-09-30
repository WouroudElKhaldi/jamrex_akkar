"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { sendTest } from "@/actions/admin/settings";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Lets each employee turn on real push notifications (with sound) on this phone/computer. */
export function PushPanel({ vapidPublicKey, canTest }: { vapidPublicKey: string; canTest: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "unsupported" | "blocked" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);
  const [testing, startTest] = useTransition();
  const [result, setResult] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapidPublicKey]);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
      const reg = (await navigator.serviceWorker.register("/sw.js", { scope: "/" })) && (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
      await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {state === "unsupported" && <p className="text-sm text-muted">{t("a.pushUnsupported")}</p>}
      {state === "blocked" && <p className="text-sm font-semibold text-danger">{t("a.pushBlocked")}</p>}
      {state === "off" && <Button onClick={enable} disabled={busy}>{busy ? <Spinner /> : <Bell className="h-4 w-4" />} {t("a.pushEnable")}</Button>}
      {state === "on" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ok"><Bell className="h-4 w-4" /> {t("a.pushEnabled")}</span>
          <Button variant="outline" size="sm" onClick={disable} disabled={busy}><BellOff className="h-4 w-4" /> {t("a.remove")}</Button>
        </div>
      )}
      <p className="text-xs text-muted">{t("a.installApp")}</p>
      {canTest && (
        <div>
          <Button variant="outline" size="sm" disabled={testing} onClick={() => startTest(async () => setResult(await sendTest()))}>
            {testing ? <Spinner /> : <Send className="h-4 w-4" />} {t("a.testNotify")}
          </Button>
          {result && <ul className="mt-3 space-y-1 text-sm">{Object.entries(result).map(([k, v]) => <li key={k}><b>{k}</b>: {v}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
