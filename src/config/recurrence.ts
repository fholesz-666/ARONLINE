/**
 * Parametry opakované platby (předplatné) – zobrazují se zákazníkovi před souhlasem
 * podle požadavků GoPay („Jaké informace musím prezentovat pro opakované platby?“, ověřeno 22. 10. 2026)
 * a ukládají se k objednávce jako doklad o udělení souhlasu.
 */

/** Verze textu souhlasu – při změně textu zvýšit. */
export const RECURRENCE_TERMS_VERSION = "2026-10-22";

/** Opakovaná platba se zakládá nejdéle na 10 let (parametr recurrence_date_to). */
export const RECURRENCE_MAX_MONTHS = 120;

export interface RecurrenceTermsInput {
  productName: string;
  priceHaler: number;
  periodMonths: number;
  contactEmail: string;
  start?: Date;
}

export interface RecurrenceTerm {
  label: string;
  value: string;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

export function recurrenceDateTo(start = new Date()): string {
  return addMonths(start, RECURRENCE_MAX_MONTHS).toISOString().slice(0, 10);
}

const czk = (h: number) => `${(h / 100).toLocaleString("cs-CZ")} Kč`;

export function recurrenceTerms(p: RecurrenceTermsInput): RecurrenceTerm[] {
  const start = p.start ?? new Date();
  const until = new Date(recurrenceDateTo(start)).toLocaleDateString("cs-CZ");
  const every = p.periodMonths === 1 ? "jednou měsíčně" : `jednou za ${p.periodMonths} měsíce`;
  return [
    { label: "Důvod opakované platby", value: `Předplatné tarifu „${p.productName}“ v aplikaci ARONLINE` },
    { label: "Částka", value: `${czk(p.priceHaler)} za období – částka je fixní (nejvýše ${czk(p.priceHaler)})` },
    {
      label: "Frekvence a datum stržení",
      value: `${every}, vždy v den odpovídající datu první platby (fixní); první platba ihned při objednávce`,
    },
    { label: "Doba trvání", value: `do zrušení, nejdéle do ${until}` },
    {
      label: "Změna nastavení",
      value: `e-mailem na ${p.contactEmail} nebo v aplikaci v sekci Předplatné a kredity`,
    },
    {
      label: "Zrušení",
      value:
        "kdykoli tlačítkem „Zrušit předplatné“ v sekci Předplatné a kredity nebo e-mailem; další platby se již nestrhnou, předplatné platí do konce zaplaceného období",
    },
  ];
}

export const RECURRENCE_CONSENT =
  "Souhlasím se založením opakované platby s výše uvedenými parametry a s uložením údajů o mé platební kartě u platební brány GoPay pro účely jejího provádění.";

export const PCI_NOTE =
  "S údaji o platební kartě nakládá GoPay s.r.o. podle mezinárodního bezpečnostního standardu PCI DSS Level 1 (nejvyšší úroveň zabezpečení při zpracování platebních karet). Provozovatel ARONLINE k údajům o kartě nemá přístup.";
