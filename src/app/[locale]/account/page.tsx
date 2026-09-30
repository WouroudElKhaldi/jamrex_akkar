import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getT } from "@/i18n";
import { formatDate, isLocale, money, orderCode } from "@/lib/utils";
import { Badge, Button, Card } from "@/components/ui";
import { LoginForm, ProfileForm, RegisterForm } from "@/components/store/forms";
import { VerifyBanner } from "@/components/store/verify-banner";
import { logoutCustomer } from "@/actions/customer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { next } = await searchParams;
  const t = getT(locale);
  const customer = await getCustomer();

  if (!customer) {
    return (
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:grid-cols-2 md:py-20">
        <Card className="p-7">
          <h1 className="mb-6 text-2xl font-black">{t("account.loginTitle")}</h1>
          <LoginForm next={next} />
        </Card>
        <Card className="p-7">
          <h2 className="mb-6 text-2xl font-black">{t("account.registerTitle")}</h2>
          <RegisterForm next={next} />
        </Card>
      </div>
    );
  }

  // until the email is confirmed only orders placed after the account was created are shown (protects the history of that email address)
  const orders = await db.order.findMany({
    where: { customerId: customer.id, ...(customer.emailVerifiedAt ? {} : { createdAt: { gte: customer.accountCreatedAt ?? new Date(0) } }) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">{t("account.welcome", { name: customer.name.split(" ")[0] })}</h1>
        <form action={logoutCustomer}>
          <input type="hidden" name="locale" value={locale} />
          <Button variant="outline" size="sm" type="submit">{t("common.logout")}</Button>
        </form>
      </div>

      {!customer.emailVerifiedAt && <VerifyBanner />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-4 text-xl font-bold">{t("account.myOrders")}</h2>
          {orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-14 text-center text-muted">{t("account.noOrders")}</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Link key={o.id} href={`/${locale}/order/${orderCode(o.number)}?k=${o.accessKey}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-brand/40">
                  <div>
                    <p className="font-bold" dir="ltr">{orderCode(o.number)}</p>
                    <p className="text-xs text-muted">{formatDate(o.createdAt, locale)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={o.status === "CANCELLED" ? "danger" : o.status === "DELIVERED" ? "ok" : "brand"}>{t(`order.status${o.status}`)}</Badge>
                    <span className="font-black">{money(o.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Card className="h-fit p-6">
          <h2 className="mb-4 text-lg font-bold">{t("account.profile")}</h2>
          <p className="mb-4 space-y-0.5 text-sm text-muted"><span className="block" dir="ltr">{customer.email}</span><span className="block" dir="ltr">{customer.phone}</span></p>
          <ProfileForm name={customer.name} address={customer.address ?? ""} />
        </Card>
      </div>
    </div>
  );
}
