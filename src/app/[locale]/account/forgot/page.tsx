import { notFound } from "next/navigation";
import { getT } from "@/i18n";
import { isLocale } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ForgotForm } from "@/components/store/forms";

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-7">
        <h1 className="text-2xl font-black">{t("account.forgotTitle")}</h1>
        <p className="mb-6 mt-2 text-sm text-muted">{t("account.forgotText")}</p>
        <ForgotForm />
      </Card>
    </div>
  );
}
