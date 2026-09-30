"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Small shadcn-style component kit (hand-written, no extra runtime dependency).

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg hover:bg-brand-hover shadow-card hover:shadow-glow",
        accent: "bg-accent text-accent-fg hover:bg-accent-hover shadow-card hover:shadow-glow",
        outline: "border border-border bg-surface hover:bg-surface-2 text-fg",
        ghost: "hover:bg-surface-2 text-fg",
        soft: "bg-brand-soft text-brand hover:opacity-80",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: { sm: "h-9 px-3", md: "h-11 px-5", lg: "h-12 px-7 text-base", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

const fieldBase =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg placeholder:text-muted/70 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(fieldBase, "h-11", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(fieldBase, "h-11 cursor-pointer", className)} {...p} />
));
Select.displayName = "Select";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...p} />;
}

export function Field({ label, hint, error, children, className }: { label?: React.ReactNode; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Badge({ className, tone = "brand", ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "brand" | "accent" | "danger" | "warn" | "ok" | "muted" }) {
  const tones = {
    brand: "bg-brand-soft text-brand",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger/15 text-danger",
    warn: "bg-warn/20 text-warn",
    ok: "bg-ok/15 text-ok",
    muted: "bg-surface-2 text-muted",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...p} />;
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)} {...p} />;
}

/** A checkbox styled as a switch. Works inside plain <form action> (submits "1" when on). */
export function Switch({ name, defaultChecked, label, onChange }: { name?: string; defaultChecked?: boolean; label?: React.ReactNode; onChange?: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} onChange={(e) => onChange?.(e.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-11 rounded-full bg-border transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5" />
      {label}
    </label>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}
