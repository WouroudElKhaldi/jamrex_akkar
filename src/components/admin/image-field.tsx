"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";
import { imageUrl } from "@/lib/utils";

/** Image picker for plain <form action> forms: uploads immediately, posts the stored path in a hidden input. */
export function ImageField({ name, defaultValue = "", label }: { name: string; defaultValue?: string; label?: string }) {
  const { t } = useI18n();
  const [path, setPath] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function onFile(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPath(data.paths[0]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium">{label}</p>}
      <input type="hidden" name={name} value={path} />
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
          {path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(path)} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted" />
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files)} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Spinner /> : <ImagePlus className="h-4 w-4" />} {busy ? t("a.uploading") : t("a.upload")}
        </Button>
        {path && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setPath("")}>
            <X className="h-4 w-4" /> {t("a.remove")}
          </Button>
        )}
      </div>
      {err && <p className="mt-1 text-xs font-medium text-danger">{err}</p>}
    </div>
  );
}
