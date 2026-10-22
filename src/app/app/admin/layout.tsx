import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-panels";
import { getCurrent, isAdmin } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const c = await getCurrent();
  if (!isAdmin(c)) redirect("/app");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Správa služby</h1>
        <p className="text-sm text-muted">Přihlášen jako správce: {c!.user.email}</p>
      </div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
