import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { PageHeader } from "@/components/admin/bits";
import { SecurityPanel } from "@/components/admin/security-panel";

export const metadata = { title: "Security" };

// open to every signed-in employee: each person protects their own account
export default async function SecurityPage() {
  const me = await requireStaff();
  const { t } = await adminT();
  const u = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { totpEnabled: true, recoveryHashes: true } });
  return (
    <>
      <PageHeader title={t("a.security")} />
      <SecurityPanel enabled={u.totpEnabled} recoveryLeft={u.recoveryHashes.length} />
    </>
  );
}
