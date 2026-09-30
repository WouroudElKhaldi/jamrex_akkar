import { redirect } from "next/navigation";
import { adminBase, getStaff } from "@/lib/auth";
import { LoginFormAdmin } from "@/components/admin/login-form";

export default async function AdminLoginPage() {
  if (await getStaff()) redirect(adminBase());
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-soft via-bg to-accent-soft px-4">
      <LoginFormAdmin />
    </div>
  );
}
