/**
 * Český bankovní účet: kontrola formátu, převod na IBAN a řetězec QR platby (SPAYD / „QR Platba“ ČBA).
 */

export interface CzAccount {
  prefix: string;
  number: string;
  bankCode: string;
}

const RE = /^\s*(?:(\d{1,6})-)?(\d{2,10})\s*\/\s*(\d{4})\s*$/;

/** Vážený součet podle vyhlášky ČNB č. 169/2011 Sb. (váhy 6,3,7,9,10,5,8,4,2,1 zprava). */
function mod11ok(digits: string): boolean {
  const w = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
  const d = digits.split("").reverse();
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += Number(d[i]) * w[i];
  return sum % 11 === 0;
}

export function parseCzAccount(text: string): CzAccount | null {
  const m = RE.exec(text);
  if (!m) return null;
  const prefix = m[1] ?? "";
  const number = m[2];
  const bankCode = m[3];
  if (prefix && !mod11ok(prefix)) return null;
  if (!mod11ok(number)) return null;
  return { prefix, number, bankCode };
}

export function formatCzAccount(a: CzAccount): string {
  return `${a.prefix ? `${a.prefix}-` : ""}${a.number}/${a.bankCode}`;
}

function mod97(numeric: string): number {
  let r = 0;
  for (const ch of numeric) r = (r * 10 + Number(ch)) % 97;
  return r;
}

/** IBAN pro český účet (CZkk BBBB PPPPPP NNNNNNNNNN). */
export function czIban(a: CzAccount): string {
  const bban = a.bankCode + a.prefix.padStart(6, "0") + a.number.padStart(10, "0");
  // "CZ" = 12 35, kontrolní číslice 00
  const check = 98 - mod97(bban + "123500");
  return `CZ${String(check).padStart(2, "0")}${bban}`;
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function isValidIban(iban: string): boolean {
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return mod97(numeric) === 1;
}

/** Řetězec pro QR Platbu (SPAYD 1.0). Zpráva bez diakritiky a hvězdiček, max. 60 znaků. */
export function spayd(p: { iban: string; amountHaler: number; vs?: string; message?: string }): string {
  const msg = (p.message ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[*]/g, " ")
    .toUpperCase()
    .slice(0, 60);
  const parts = [
    "SPD*1.0",
    `ACC:${p.iban.replace(/\s+/g, "")}`,
    `AM:${(p.amountHaler / 100).toFixed(2)}`,
    "CC:CZK",
  ];
  if (p.vs) parts.push(`X-VS:${p.vs}`);
  if (msg) parts.push(`MSG:${msg}`);
  return parts.join("*");
}
