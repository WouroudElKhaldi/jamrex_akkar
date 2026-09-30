"use client";

import { useState, useTransition } from "react";
import { Copy, Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { findTelegramChats, type TelegramChat } from "@/actions/admin/settings";

/** Lists the groups / people the Telegram bot knows about, with a copy button for the chat id. */
export function TelegramFinder() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [chats, setChats] = useState<TelegramChat[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("a.tgFinderHelp")}</p>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const r = await findTelegramChats();
            if (r.ok) setChats(r.chats);
            else {
              setChats(null);
              setError(r.error);
            }
          })
        }
      >
        {pending ? <Spinner /> : <Search className="h-4 w-4" />} {t("a.tgFinder")}
      </Button>
      {error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
      {chats && chats.length === 0 && <p className="text-sm text-muted">{t("a.tgNone")}</p>}
      {chats && chats.length > 0 && (
        <ul className="space-y-2">
          {chats.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm">
              <span>
                <b>{c.title}</b> <span className="text-muted">({c.type})</span>
                <code className="ms-2 rounded bg-surface px-1.5 py-0.5" dir="ltr">{c.id}</code>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(c.id);
                  setCopied(c.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-brand hover:bg-brand-soft"
              >
                <Copy className="h-4 w-4" /> {copied === c.id ? t("a.tgCopied") : t("a.tgCopy")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
