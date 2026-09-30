import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/auth";
import { getT } from "@/i18n";
import { isLocale } from "@/lib/utils";
import { Card } from "@/components/ui";
import { SetPasswordForm } from "@/components/store/forms";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { token } = await searchParams;
  const t = getT(locale);
  const row = token ? await db.authToken.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  const valid = !!row && !row.usedAt && row.expiresAt > new Date();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-7">
        {valid ? (
          <>
            <h1 className="text-2xl font-black">{t("account.setPassword")}</h1>
            <p className="mb-6 mt-2 text-sm text-muted">{t("account.setPasswordText")}</p>
            <SetPasswordForm token={token!} />
          </>
        ) : (
          <p className="font-semibold text-danger">{t("account.tokenInvalid")}</p>
        )}
      </Card>
    </div>
  );
}
