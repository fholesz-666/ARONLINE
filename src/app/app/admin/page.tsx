import { redirect } from "next/navigation";
import { AdminProducts } from "@/components/admin";
import { getCurrent } from "@/server/auth/session";
import { getVerificationSummary } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";
import { getConfig } from "@/server/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Správa" };

export default async function AdminPage() {
  const c = await getCurrent();
  if (!c || c.user.role !== "ADMIN") redirect("/app");
  const v = getVerificationSummary();
  const cfg = getConfig();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl">Správa služby</h1>
      <section className="panel mt-6 p-5 text-sm">
        <h2 className="text-lg">Provozní stav</h2>
        <ul className="mt-2 space-y-1">
          <li>Prostředí: {cfg.APP_ENV}</li>
          <li>Platby: {cfg.PAYMENTS_MODE}{cfg.PAYMENTS_MODE !== "mock" && !cfg.gopayConfigured ? " – chybí přístupové údaje GoPay" : ""}</li>
          <li>Opakované platby (předplatné): {cfg.GOPAY_RECURRENCE_ENABLED ? "povoleny" : "vypnuty"}</li>
          <li>
            Ověření výpočetního jádra: {v.verified} / {v.total}
            {cfg.REQUIRE_VERIFIED_CORE && !v.fullyVerified ? " – placené exporty jsou blokovány" : ""}
          </li>
          <li>Rozsah náhledu před zaplacením: {cfg.PREVIEW_DETAIL === "full" ? "plný" : "souhrn"}</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-lg">Ceník</h2>
        <p className="text-sm text-ink-soft">Změna ceny se projeví u nových objednávek. Již vytvořené objednávky si cenu pamatují.</p>
        <AdminProducts />
      </section>
    </div>
  );
}
