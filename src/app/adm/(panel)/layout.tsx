import { db } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { AdminShell, type NavItem } from "@/components/admin/shell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [newOrders, unread] = await Promise.all([
    can(user, "orders.view") ? db.order.count({ where: { status: "NEW", NOT: { paymentMethod: "WHISH", paymentStatus: { not: "PAID" } } } }) : 0,
    can(user, "messages.view") ? db.contactMessage.count({ where: { read: false } }) : 0,
  ]);

  const all: (NavItem & { perm?: string })[] = [
    { id: "dashboard", href: "" },
    { id: "orders", href: "/orders", perm: "orders.view", badge: newOrders },
    { id: "products", href: "/products", perm: "products.view" },
    { id: "offers", href: "/offers", perm: "offers.manage" },
    { id: "categories", href: "/categories", perm: "categories.manage" },
    { id: "inventory", href: "/inventory", perm: "stock.update" },
    { id: "customers", href: "/customers", perm: "customers.view" },
    { id: "messages", href: "/messages", perm: "messages.view", badge: unread },
    { id: "delivery", href: "/delivery", perm: "delivery.manage" },
    { id: "content", href: "/content", perm: "content.edit" },
    { id: "pages", href: "/pages", perm: "pages.manage" },
    { id: "banners", href: "/banners", perm: "banners.manage" },
    { id: "testimonials", href: "/testimonials", perm: "banners.manage" },
    { id: "media", href: "/media", perm: "media.manage" },
    { id: "staff", href: "/staff", perm: "staff.manage" },
    { id: "notifications", href: "/notifications" },
    { id: "security", href: "/security" },
    { id: "payments", href: "/payments", perm: "payments.manage" },
    { id: "settings", href: "/settings", perm: "settings.manage" },
    { id: "audit", href: "/audit", perm: "audit.view" },
  ];
  // the support-only log page exists in the menu of exactly one account
  if (user.hidden) all.push({ id: "support", href: "/support" });
  const items = all.filter((i) => !i.perm || can(user, i.perm)).map(({ perm: _p, ...rest }) => rest);

  return (
    <AdminShell items={items} userName={user.name}>
      {children}
    </AdminShell>
  );
}
