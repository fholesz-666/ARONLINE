import { AdminOverview } from "@/components/admin-panels";
import { getVerificationSummary } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";
import { getConfig } from "@/server/config";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Správa" };

export default async function AdminPage() {
  const v = getVerificationSummary();
  const cfg = getConfig();
  const s = await getSettings();
  const missing = [
    !s.operator.address && "adresa sídla provozovatele (povinný údaj na dokladech a v obchodních podmínkách)",
    !s.operator.phone && "telefon (GoPay vyžaduje telefon v kontaktech)",
    !s.bank.accountValid && "platné číslo účtu pro platby převodem",
    !cfg.SMTP_HOST && "SMTP – bez něj se neodesílají e-maily (registrace, doklady)",
  ].filter(Boolean) as string[];
  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div className="border-l-4 border-signal bg-signal-soft px-3 py-2 text-sm">
          <p className="font-semibold">Doplňte před ostrým prodejem</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <AdminOverview />
      <section className="panel p-5 text-sm">
        <h2 className="text-lg">Provozní stav</h2>
        <ul className="mt-2 space-y-1">
          <li>Prostředí: {cfg.APP_ENV} · adresa webu: {cfg.APP_URL}</li>
          <li>
            Platba kartou: {cfg.PAYMENTS_MODE}
            {cfg.PAYMENTS_MODE !== "mock" && !cfg.gopayConfigured ? " – chybí přístupové údaje GoPay (platba kartou je vypnutá)" : ""}
          </li>
          <li>Platba převodem: {s.bank.enabled && s.bank.accountValid ? `zapnutá, účet ${s.bank.account}` : "vypnutá"}</li>
          <li>Opakované platby (předplatné): {cfg.GOPAY_RECURRENCE_ENABLED ? "povoleny" : "vypnuty"}</li>
          <li>
            Ověření výpočetního jádra: {v.verified} / {v.total}
            {cfg.REQUIRE_VERIFIED_CORE && !v.fullyVerified ? " – placené exporty jsou blokovány" : ""}
          </li>
          <li>Rozsah náhledu před zaplacením: {cfg.PREVIEW_DETAIL === "full" ? "plný" : "souhrn"}</li>
          <li>Odesílání e-mailů: {cfg.SMTP_HOST ? `SMTP ${cfg.SMTP_HOST}, odesílatel ${cfg.MAIL_FROM}` : "nenastaveno"}</li>
        </ul>
      </section>
    </div>
  );
}
