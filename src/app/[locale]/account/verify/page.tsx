import { notFound } from "next/navigation";
import { getT } from "@/i18n";
import { isLocale } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ConfirmEmailButton } from "@/components/store/confirm-email";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { token } = await searchParams;
  const t = getT(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="space-y-4 p-7 text-center">
        <h1 className="text-2xl font-black">{t("account.verifyTitle")}</h1>
        <ConfirmEmailButton token={token ?? ""} />
      </Card>
    </div>
  );
}
