export function LegalDraftNotice() {
  return (
    <p className="mt-4 border-l-4 border-signal bg-signal-soft px-3 py-2 text-sm">
      Návrh textu k odborné právní kontrole. Před spuštěním placeného provozu jej musí posoudit právník a doplnit údaje o provozovateli.
    </p>
  );
}

export function Operator() {
  const name = process.env.OPERATOR_NAME || "[jméno / název provozovatele]";
  const ico = process.env.OPERATOR_ICO || "[IČO]";
  const addr = process.env.OPERATOR_ADDRESS || "[sídlo]";
  const email = process.env.OPERATOR_EMAIL || "[kontaktní e-mail]";
  return (
    <>
      {name}, IČO {ico}, se sídlem {addr}, e-mail {email}
    </>
  );
}
