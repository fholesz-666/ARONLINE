import { OPERATOR } from "@/config/operator";
import { getSettings } from "@/server/services/settings";

export function LegalDraftNotice() {
  return (
    <p className="mt-4 border-l-4 border-signal bg-signal-soft px-3 py-2 text-sm">
      Návrh textu k odborné právní kontrole. Před spuštěním placeného provozu jej musí posoudit právník a doplnit údaje o provozovateli.
    </p>
  );
}

/** Identifikace provozovatele z nastavení správy (server component). */
export async function Operator() {
  const { operator } = await getSettings();
  const { name, ico, address, email, phone } = operator;
  return (
    <>
      {name}
      {ico ? `, IČO ${ico}` : ", IČO [doplnit]"}
      {address ? `, s místem podnikání ${address}` : ", sídlo [doplnit ve správě]"} (FVSOL –{" "}
      <a className="link" href={OPERATOR.web} rel="noopener">
        fvsol.cz
      </a>
      ), e-mail{" "}
      <a className="link" href={`mailto:${email}`}>
        {email}
      </a>
      {phone ? `, tel. ${phone}` : ""}
    </>
  );
}
