/**
 * Texty webu, které může správce upravit ve správě (/app/admin/texty).
 * Prázdná hodnota v nastavení = použije se výchozí text odtud.
 */
export interface SiteTextDef {
  label: string;
  where: string;
  default: string;
  multiline?: boolean;
}

export const SITE_TEXTS = {
  announcement: {
    label: "Oznámení nahoře na webu",
    where: "Pruh nad hlavičkou všech veřejných stránek (prázdné = nezobrazí se)",
    default: "",
  },
  appNotice: {
    label: "Oznámení v aplikaci",
    where: "Pruh v aplikaci pro přihlášené uživatele (prázdné = nezobrazí se)",
    default: "",
  },
  topBar: {
    label: "Horní lišta (reklama fvsol.cz)",
    where: "Tmavá lišta nad hlavičkou webu",
    default: "Projekce hromosvodů (LPS) a fotovoltaických elektráren na klíč – DSP, DPS, analýza rizika, přepěťové ochrany.",
  },
  homeTitle: {
    label: "Úvodní stránka – nadpis",
    where: "Hlavní nadpis (H1) úvodní stránky",
    default: "Analýza rizika ochrany před bleskem bez přepisování podkladů",
  },
  homeLead: {
    label: "Úvodní stránka – perex",
    where: "Odstavec pod hlavním nadpisem",
    default:
      "Ověření rizika podle ČSN EN 62305-2 ed. 2 (výpočet podle ed. 3 nasadíme od 10/2027). Budovu a okolí načte z katastru, bouřkové dny z mapy ČR, výpočet vede krok za krokem a dokumentaci vydá s vaším razítkem v PDF i ve Wordu.",
    multiline: true,
  },
  homeNote: {
    label: "Úvodní stránka – poznámka pod tlačítky",
    where: "Drobný text pod tlačítky v úvodu",
    default: "Platíte až za stažení hotové dokumentace. Rozpracované analýzy se ukládají automaticky.",
  },
  pricingIntro: {
    label: "Ceník – úvodní text",
    where: "Úvod sekce Ceník na úvodní stránce a na stránce Ceník",
    default: "Analýzu založíte, vyplníte a spočítáte zdarma. Platíte za odemčení dokumentace konkrétního objektu.",
    multiline: true,
  },
  footerAbout: {
    label: "Patička – popis",
    where: "Krátký popis pod logem v patičce",
    default: "Analýza rizika ochrany před bleskem pro projektanty elektro a LPS.",
  },
  contactIntro: {
    label: "Kontakty – úvodní text",
    where: "Stránka Kontakty",
    default:
      "Máte dotaz k aplikaci, platbě nebo dokladu? Napište nám. Odpovídáme zpravidla do dvou pracovních dnů.",
    multiline: true,
  },
  contactHours: {
    label: "Kontakty – dostupnost",
    where: "Stránka Kontakty, pod e-mailem a telefonem",
    default: "Po–Pá 8:00–16:00",
  },
  bankTransferNote: {
    label: "Platba převodem – pokyny",
    where: "Stránka s platebními údaji po objednávce převodem",
    default:
      "Po připsání platby na účet (obvykle 1–2 pracovní dny) odemkneme dokumentaci a pošleme doklad e-mailem. Uveďte prosím správný variabilní symbol.",
    multiline: true,
  },
} satisfies Record<string, SiteTextDef>;

export type SiteTextKey = keyof typeof SITE_TEXTS;
export type SiteTexts = Record<SiteTextKey, string>;

export function defaultTexts(): SiteTexts {
  return Object.fromEntries(Object.entries(SITE_TEXTS).map(([k, v]) => [k, v.default])) as SiteTexts;
}
