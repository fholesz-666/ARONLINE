import { OPERATOR } from "@/config/operator";

export function LegalDraftNotice() {
  return (
    <p className="mt-4 border-l-4 border-signal bg-signal-soft px-3 py-2 text-sm">
      Návrh textu k odborné právní kontrole. Před spuštěním placeného provozu jej musí posoudit právník a doplnit údaje o provozovateli.
    </p>
  );
}

export function Operator() {
  const { name, ico, address, email, web } = OPERATOR;
  return (
    <>
      {name}
      {ico ? `, IČO ${ico}` : ", IČO [doplnit]"}
      {address ? `, se sídlem ${address}` : ", sídlo [doplnit]"} (FVSOL –{" "}
      <a className="link" href={web} rel="noopener">
        fvsol.cz
      </a>
      ), e-mail{" "}
      <a className="link" href={`mailto:${email}`}>
        {email}
      </a>
    </>
  );
}
