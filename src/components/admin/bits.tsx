import * as React from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-4">
        {Icon && (
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-glow">
            <span className="absolute inset-0 animate-pulse rounded-2xl bg-white/10" />
            <Icon className="relative h-7 w-7" />
          </span>
        )}
        <div>
          <h1 className="bg-gradient-to-r from-fg to-fg/70 bg-clip-text text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}


export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto rounded-2xl border border-border bg-surface shadow-card", className)}>{children}</div>;
}
export const tableCls = "w-full text-sm";
export const thCls = "whitespace-nowrap border-b border-border bg-surface-2/60 px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted";
export const tdCls = "border-b border-border/60 px-4 py-3 align-middle";

export function StatCard({ label, value, tone = "brand" }: { label: string; value: React.ReactNode; tone?: "brand" | "accent" | "warn" | "danger" }) {
  const tones = { brand: "from-brand to-[#3b6cf6]", accent: "from-accent to-[#12d1ba]", warn: "from-warn to-[#ffcc66]", danger: "from-danger to-[#ff8a8e]" };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className={cn("absolute -end-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-20", tones[tone])} />
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

export const STATUS_TONE: Record<string, "brand" | "warn" | "ok" | "danger" | "accent" | "muted"> = {
  NEW: "warn",
  CONFIRMED: "brand",
  PREPARING: "accent",
  OUT_FOR_DELIVERY: "brand",
  DELIVERED: "ok",
  CANCELLED: "danger",
};
export const PAY_TONE: Record<string, "brand" | "warn" | "ok" | "danger" | "accent" | "muted"> = { UNPAID: "muted", PENDING: "warn", PAID: "ok", FAILED: "danger", REFUNDED: "muted" };

export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "muted"}>{label}</Badge>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border py-14 text-center text-muted">{children}</div>;
}

export function FlashMessage({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return <p className={cn("mb-4 rounded-xl p-3 text-sm font-semibold", ok ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger")}>{children}</p>;
}
