import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDict } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { AdminBaseProvider } from "@/components/admin/admin-context";
import { adminBase } from "@/lib/auth";

// Everything under the secret path: never indexed, never cached.
export const metadata: Metadata = {
  title: { default: "Staff", template: "%s · Staff" },
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true, noimageindex: true },
  appleWebApp: { capable: true, title: "Jamrex Staff", statusBarStyle: "black-translucent" },
};

export const dynamic = "force-dynamic";

export default async function AdmLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-locale") === "ar" ? "ar" : "en";
  return (
    <I18nProvider locale={locale} dict={getDict(locale)}>
      {/* credentials are sent so the (staff-only) manifest can be fetched by the installed app */}
      <link rel="manifest" href="/api/admin-manifest" crossOrigin="use-credentials" />
      <AdminBaseProvider base={adminBase()}>{children}</AdminBaseProvider>
    </I18nProvider>
  );
}
