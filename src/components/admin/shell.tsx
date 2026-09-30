"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, EyeOff, BadgePercent, KeyRound, Bell, BarChart3, Boxes, FileText, Image as ImageIcon, LayoutDashboard, LogOut, Mail, Menu, MessageSquare, Package, Settings, ShoppingBag, ShieldCheck, Star, Tags, Truck, Users, X, ExternalLink, ScrollText } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useAdminBase } from "./admin-context";
import { LangToggleAdmin } from "./admin-toggles";
import { ThemeToggle } from "@/components/theme-toggle";
import { staffLogout } from "@/actions/admin/auth";
import { cn } from "@/lib/utils";

const ICONS = { dashboard: LayoutDashboard, orders: ShoppingBag, products: Package, categories: Tags, inventory: Boxes, customers: Users, delivery: Truck, content: FileText, pages: ScrollText, banners: ImageIcon, testimonials: Star, media: ImageIcon, staff: ShieldCheck, settings: Settings, audit: BarChart3, messages: MessageSquare, mail: Mail, notifications: Bell, offers: BadgePercent, security: KeyRound, support: EyeOff, payments: CreditCard } as const;

export type NavItem = { id: keyof typeof ICONS; href: string; badge?: number };

export function AdminShell({ items, userName, children }: { items: NavItem[]; userName: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const base = useAdminBase();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map(({ id, href, badge }) => {
        const Icon = ICONS[id];
        const full = base + href;
        const active = href === "" ? pathname === base || pathname === base + "/" : pathname.startsWith(full);
        return (
          <Link key={id} href={full || "/"} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", active ? "text-brand-fg" : "text-muted hover:text-fg")}>
            {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand to-[#3b6cf6] shadow-glow" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            {!active && <span className="absolute inset-0 -z-0 origin-left rtl:origin-right scale-x-0 rounded-xl bg-surface-2 transition-transform duration-300 group-hover:scale-x-100" />}
            <Icon className="relative h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6" />
            <span className="relative flex-1">{t(`a.${id}`)}</span>
            {!!badge && <span className="relative animate-pulse rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-e border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="flex h-9 w-9 animate-[wiggle_6s_ease-in-out_infinite] items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent font-black text-white shadow-glow">J</span>
          <span className="font-black leading-tight">Jamrex <span className="text-accent">Staff</span></span>
        </div>
        {nav}
        <SidebarFooter userName={userName} />
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-surface shadow-glow">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <span className="font-black">Jamrex <span className="text-accent">Staff</span></span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-surface-2"><X className="h-5 w-5" /></button>
            </div>
            {nav}
            <SidebarFooter userName={userName} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-bg/85 px-4 backdrop-blur-xl">
          <button onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-surface-2 lg:hidden" aria-label="menu"><Menu className="h-5 w-5" /></button>
          <span className="hidden text-sm font-semibold text-muted sm:inline">{t("a.welcome", { name: userName })}</span>
          <div className="ms-auto flex items-center gap-1">
            <a href="/" target="_blank" rel="noopener" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 sm:inline-flex"><ExternalLink className="h-4 w-4" /> {t("a.viewSite")}</a>
            <LangToggleAdmin />
            <ThemeToggle />
            <Link href={base + "/profile"} title={t("a.profile")} className={cn("ms-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent font-black text-white shadow-card transition hover:scale-110 hover:shadow-glow", pathname.startsWith(base + "/profile") && "ring-2 ring-brand ring-offset-2 ring-offset-bg")}>{userName.slice(0, 1).toUpperCase()}</Link>
          </div>
        </header>
        <motion.main key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-7xl p-4 md:p-8">{children}</motion.main>
      </div>
    </div>
  );
}

function SidebarFooter({ userName }: { userName: string }) {
  const { t } = useI18n();
  return (
    <form action={staffLogout} className="no-print border-t border-border p-3">
      <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-danger/10 hover:text-danger">
        <LogOut className="h-[18px] w-[18px]" />
        <span className="flex-1 text-start">{t("a.logout")}</span>
        <span className="max-w-24 truncate text-xs opacity-70">{userName}</span>
      </button>
    </form>
  );
}

/** Refreshes server data every N seconds while the tab is visible (live order list). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
