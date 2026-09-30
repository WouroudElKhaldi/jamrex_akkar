"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, Spinner } from "@/components/ui";

export function MediaUploader() {
  const { t } = useI18n();
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = e.target.files;
          if (!files?.length) return;
          setBusy(true);
          setErr("");
          const fd = new FormData();
          Array.from(files).forEach((f) => fd.append("file", f));
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
          if (!res.ok) setErr((await res.json().catch(() => ({}))).error || "Upload failed");
          setBusy(false);
          if (ref.current) ref.current.value = "";
          router.refresh();
        }}
      />
      <Button onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Spinner /> : <ImagePlus className="h-4 w-4" />} {t("a.upload")}</Button>
      {err && <span className="text-sm font-semibold text-danger">{err}</span>}
    </>
  );
}
