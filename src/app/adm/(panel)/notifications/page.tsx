import { requireStaff } from "@/lib/auth";
import { adminT } from "@/lib/admin-t";
import { PageHeader } from "@/components/admin/bits";
import { PushPanel } from "@/components/admin/push-panel";
import { Card } from "@/components/ui";

export const metadata = { title: "Notifications" };

// Open to every signed-in employee: each person enables push on their own phone.
// (Whether they RECEIVE order alerts is controlled by the "orders.alerts" permission.)
export default async function NotificationsPage() {
  await requireStaff();
  const { t } = await adminT();
  return (
    <>
      <PageHeader title={t("a.notifications")} />
      <Card className="max-w-2xl p-6">
        <PushPanel vapidPublicKey={process.env.VAPID_PUBLIC_KEY || ""} canTest={false} />
      </Card>
    </>
  );
}
