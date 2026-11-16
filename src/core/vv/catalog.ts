/**
 * Katalog vnějších vlivů pro protokol o určení vnějších vlivů.
 *
 * Zdroj: ČSN 33 2000-5-51 ed. 3 + Z1 + Z2 (07/2022), příloha ZA, tabulka ZA.1 „Charakteristiky vnějších vlivů“
 * a příloha A „Stručný seznam vnějších vlivů“. Kódy, meze a příznak „normální“ odpovídají tabulce ZA.1
 * včetně národních poznámek (v ČR se za normální považují i AD1, AE1 a BC2).
 *
 * Popisy a doporučená opatření jsou vlastní stručné formulace (nejde o citaci normy).
 * U skupiny AM, kde tabulka neuvádí výslovně „normální“, je příznak zvolen podle toho,
 * zda tabulka pro danou úroveň požaduje zvláštní opatření nebo zvláštní zařízení.
 */

export type VvSection = "A" | "B" | "C";

/** Hodnota „neuvažuje se“ (vliv se v prostoru neposuzuje). */
export const NOT_CONSIDERED = "N" as const;

export interface VvLevel {
  /** Kód vlivu, např. „AD4“ nebo „AM-23-2“ */
  code: string;
  /** Krátký popis úrovně */
  label: string;
  /** Vliv považovaný za normální (tabulka ZA.1 + národní poznámky) */
  normal: boolean;
  /** Doporučené opatření, pokud vliv není normální */
  measure?: string;
}

export interface VvInfluence {
  /** Identifikátor řádku protokolu, např. „AA“ nebo „AM-23“ */
  id: string;
  section: VvSection;
  /** Název vnějšího vlivu (řádek protokolu) */
  name: string;
  /** Nadřazená skupina pro zobrazení (jen AM) */
  group?: string;
  /** Nápověda k vyplnění */
  help?: string;
  /** Lze zvolit „neuvažuje se“ */
  allowNotConsidered: boolean;
  levels: VvLevel[];
}

export const SECTION_LABELS: Record<VvSection, string> = {
  A: "A – Prostředí",
  B: "B – Využití",
  C: "C – Konstrukce budov",
};

const AM_GROUP = "AM – Elektromagnetické, elektrostatické a ionizující působení";
const AM_GENERIC = "Zvolit zařízení s odpovídající odolností nebo omezit působení (filtrace, stínění, oddělení obvodů) – viz ČSN 33 2000-4-444.";

export const VV_CATALOG: VvInfluence[] = [
  /* ------------------------------ A – Prostředí ------------------------------ */
  {
    id: "AA",
    section: "A",
    name: "Teplota okolí",
    help: "Teplota vzduchu v místě zařízení bez vlastního tepla posuzovaného zařízení.",
    allowNotConsidered: false,
    levels: [
      { code: "AA1", label: "−60 °C až +5 °C", normal: false, measure: "Zařízení určené pro velmi nízké teploty, případně temperování (vytápění rozváděčů)." },
      { code: "AA2", label: "−40 °C až +5 °C", normal: false, measure: "Zařízení určené pro nízké teploty, případně temperování (vytápění rozváděčů)." },
      { code: "AA3", label: "−25 °C až +5 °C", normal: false, measure: "Zařízení určené pro nízké teploty, případně temperování (vytápění rozváděčů)." },
      { code: "AA4", label: "−5 °C až +40 °C", normal: true },
      { code: "AA5", label: "+5 °C až +40 °C", normal: true },
      { code: "AA6", label: "+5 °C až +60 °C", normal: false, measure: "Zařízení pro vyšší teploty, větrání nebo chlazení; přepočítat zatížitelnost vedení (ČSN 33 2000-5-52)." },
      { code: "AA7", label: "−25 °C až +55 °C", normal: false, measure: "Zařízení s rozšířeným teplotním rozsahem; zohlednit oteplení a zatížitelnost vedení (ČSN 33 2000-5-52)." },
      { code: "AA8", label: "−50 °C až +40 °C", normal: false, measure: "Zařízení pro velmi nízké teploty, případně temperování." },
    ],
  },
  {
    id: "AB",
    section: "A",
    name: "Atmosférické podmínky okolí (teplota a vlhkost)",
    help: "Kombinace teploty a relativní vlhkosti vzduchu.",
    allowNotConsidered: false,
    levels: [
      { code: "AB1", label: "−60 až +5 °C, vlhkost 3–100 %", normal: false, measure: "Zařízení pro extrémně nízké teploty; zvláštní dohoda s výrobcem zařízení." },
      { code: "AB2", label: "−40 až +5 °C, vlhkost 10–100 %", normal: false, measure: "Zařízení pro nízké teploty; zvláštní dohoda s výrobcem zařízení." },
      { code: "AB3", label: "−25 až +5 °C, vlhkost 10–100 %", normal: false, measure: "Zařízení pro nízké teploty a kondenzaci; temperování nebo vyšší krytí." },
      { code: "AB4", label: "−5 až +40 °C, vlhkost 5–95 % (bez regulace)", normal: true },
      { code: "AB5", label: "+5 až +40 °C, vlhkost 5–85 % (s regulací teploty)", normal: true },
      { code: "AB6", label: "+5 až +60 °C, vlhkost 10–100 %", normal: false, measure: "Zařízení pro vysoké teploty a vlhkost; větrání, ochrana před sluncem a sáláním." },
      { code: "AB7", label: "−25 až +55 °C, vlhkost 10–100 % (kryté, bez regulace)", normal: false, measure: "Zařízení pro proměnlivé klima s kondenzací; vyšší krytí, větrání, případně temperování." },
      { code: "AB8", label: "−50 až +40 °C, vlhkost 15–100 % (venku, nekryté)", normal: false, measure: "Zařízení určené pro venkovní nekryté prostředí; vyšší krytí, odolnost vůči kondenzaci a mrazu." },
    ],
  },
  {
    id: "AC",
    section: "A",
    name: "Nadmořská výška",
    allowNotConsidered: false,
    levels: [
      { code: "AC1", label: "do 2 000 m", normal: true },
      { code: "AC2", label: "nad 2 000 m", normal: false, measure: "Zařízení pro velkou nadmořskou výšku nebo redukční součinitele (elektrická pevnost, chlazení)." },
    ],
  },
  {
    id: "AD",
    section: "A",
    name: "Výskyt vody",
    allowNotConsidered: false,
    levels: [
      { code: "AD1", label: "zanedbatelný (IPX0)", normal: true },
      { code: "AD2", label: "volně padající kapky (IPX1/IPX2)", normal: false, measure: "Krytí alespoň IPX1, u naklonění IPX2 (ČSN EN 60529)." },
      { code: "AD3", label: "vodní tříšť (IPX3)", normal: false, measure: "Krytí alespoň IPX3 (ČSN EN 60529)." },
      { code: "AD4", label: "stříkající voda (IPX4)", normal: false, measure: "Krytí alespoň IPX4 (ČSN EN 60529) nebo umístění mimo dosah vody." },
      { code: "AD5", label: "tryskající voda (IPX5)", normal: false, measure: "Krytí alespoň IPX5 (ČSN EN 60529)." },
      { code: "AD6", label: "vlny (IPX6)", normal: false, measure: "Krytí alespoň IPX6 (ČSN EN 60529)." },
      { code: "AD7", label: "mělké ponoření (IPX7)", normal: false, measure: "Krytí IPX7 (ČSN EN 60529)." },
      { code: "AD8", label: "hluboké ponoření (IPX8)", normal: false, measure: "Krytí IPX8 (ČSN EN 60529), zařízení určené pro trvalé ponoření." },
    ],
  },
  {
    id: "AE",
    section: "A",
    name: "Výskyt cizích pevných těles",
    allowNotConsidered: false,
    levels: [
      { code: "AE1", label: "zanedbatelný (IP0X)", normal: true },
      { code: "AE2", label: "malé předměty ≥ 2,5 mm (IP3X)", normal: false, measure: "Krytí alespoň IP3X (ČSN EN 60529)." },
      { code: "AE3", label: "velmi malé předměty ≥ 1 mm (IP4X)", normal: false, measure: "Krytí alespoň IP4X (ČSN EN 60529)." },
      { code: "AE4", label: "lehká prašnost (IP5X)", normal: false, measure: "Krytí alespoň IP5X (ČSN EN 60529)." },
      { code: "AE5", label: "střední prašnost (IP6X)", normal: false, measure: "Krytí IP6X (ČSN EN 60529)." },
      { code: "AE6", label: "silná prašnost (IP6X)", normal: false, measure: "Krytí IP6X (ČSN EN 60529), prachotěsné provedení." },
    ],
  },
  {
    id: "AF",
    section: "A",
    name: "Výskyt korozivních nebo znečišťujících látek",
    allowNotConsidered: false,
    levels: [
      { code: "AF1", label: "zanedbatelný", normal: true },
      { code: "AF2", label: "atmosférický (moře, průmyslové ovzduší)", normal: false, measure: "Korozivzdorné materiály a povrchové úpravy, případně umístění do chráněného prostoru." },
      { code: "AF3", label: "občasný nebo příležitostný (chemikálie, uhlovodíky – kotelny, garáže)", normal: false, measure: "Ochrana proti korozi podle specifikace zařízení, odolné materiály krytů a vedení." },
      { code: "AF4", label: "trvalý (chemické provozy)", normal: false, measure: "Zařízení navržené pro dané chemické látky." },
    ],
  },
  {
    id: "AG",
    section: "A",
    name: "Mechanické namáhání – ráz",
    allowNotConsidered: false,
    levels: [
      { code: "AG1", label: "nízká závažnost (domácnosti a podobně)", normal: true },
      { code: "AG2", label: "střední závažnost (běžný průmysl)", normal: false, measure: "Průmyslové zařízení nebo zesílená mechanická ochrana (odolnost IK podle ČSN EN 62262)." },
      { code: "AG3", label: "silná závažnost", normal: false, measure: "Zesílená mechanická ochrana zařízení a vedení." },
    ],
  },
  {
    id: "AH",
    section: "A",
    name: "Vibrace",
    allowNotConsidered: false,
    levels: [
      { code: "AH1", label: "nízká závažnost", normal: true },
      { code: "AH2", label: "střední závažnost (běžný průmysl)", normal: false, measure: "Zařízení odolné vibracím, pružné uložení, ohebné připojení vedení." },
      { code: "AH3", label: "silná závažnost (náročné průmyslové podmínky)", normal: false, measure: "Speciálně navržené zařízení, pružné uložení, ohebné připojení vedení." },
    ],
  },
  {
    id: "AK",
    section: "A",
    name: "Výskyt rostlinstva nebo plísní",
    allowNotConsidered: false,
    levels: [
      { code: "AK1", label: "bez nebezpečí", normal: true },
      { code: "AK2", label: "nebezpečný", normal: false, measure: "Vyšší krytí proti vniknutí, ochranné nátěry a materiály, opatření proti růstu rostlin a plísní." },
    ],
  },
  {
    id: "AL",
    section: "A",
    name: "Výskyt živočichů",
    allowNotConsidered: false,
    levels: [
      { code: "AL1", label: "bez nebezpečí", normal: true },
      { code: "AL2", label: "nebezpečný (hmyz, ptáci, hlodavci)", normal: false, measure: "Krytí proti vniknutí, utěsnění prostupů, mřížky, mechanicky odolná vedení (ochrana proti hlodavcům)." },
    ],
  },
  {
    id: "AM-1",
    section: "A",
    group: AM_GROUP,
    name: "Harmonické a meziharmonické",
    allowNotConsidered: true,
    levels: [
      { code: "AM-1-1", label: "kontrolovaná úroveň", normal: true },
      { code: "AM-1-2", label: "normální úroveň", normal: true },
      { code: "AM-1-3", label: "vysoká úroveň", normal: false, measure: "Zvláštní opatření v návrhu instalace, např. filtry harmonických." },
    ],
  },
  {
    id: "AM-2",
    section: "A",
    group: AM_GROUP,
    name: "Signální napětí",
    allowNotConsidered: true,
    levels: [
      { code: "AM-2-1", label: "kontrolovaná úroveň", normal: true },
      { code: "AM-2-2", label: "střední úroveň", normal: true },
      { code: "AM-2-3", label: "vysoká úroveň", normal: false, measure: "Zvláštní opatření proti signálním napětím (blokovací obvody)." },
    ],
  },
  {
    id: "AM-3",
    section: "A",
    group: AM_GROUP,
    name: "Změny amplitudy napětí",
    allowNotConsidered: true,
    levels: [
      { code: "AM-3-1", label: "kontrolovaná úroveň (např. UPS)", normal: true },
      { code: "AM-3-2", label: "normální úroveň", normal: true },
    ],
  },
  {
    id: "AM-4",
    section: "A",
    group: AM_GROUP,
    name: "Neustálené napětí",
    help: "Úroveň podle ČSN EN 61000-2-2.",
    allowNotConsidered: true,
    levels: [{ code: "AM-4", label: "v mezích ČSN EN 61000-2-2", normal: true }],
  },
  {
    id: "AM-5",
    section: "A",
    group: AM_GROUP,
    name: "Změny kmitočtu",
    allowNotConsidered: true,
    levels: [{ code: "AM-5", label: "±1 Hz (ČSN EN 61000-2-2)", normal: true }],
  },
  {
    id: "AM-6",
    section: "A",
    group: AM_GROUP,
    name: "Indukované napětí nízkého kmitočtu",
    allowNotConsidered: true,
    levels: [{ code: "AM-6", label: "uvažuje se (bez klasifikace)", normal: false, measure: "Vysoká odolnost signálních a řídicích systémů – viz ČSN 33 2000-4-444." }],
  },
  {
    id: "AM-7",
    section: "A",
    group: AM_GROUP,
    name: "Stejnosměrný proud v sítích AC",
    allowNotConsidered: true,
    levels: [{ code: "AM-7", label: "uvažuje se (bez klasifikace)", normal: false, measure: "Omezit výskyt stejnosměrných složek ve spotřebičích nebo v jejich blízkosti; volit vhodný typ proudového chrániče." }],
  },
  {
    id: "AM-8",
    section: "A",
    group: AM_GROUP,
    name: "Vyzařovaná magnetická pole",
    allowNotConsidered: true,
    levels: [
      { code: "AM-8-1", label: "střední úroveň", normal: true },
      { code: "AM-8-2", label: "vysoká úroveň", normal: false, measure: "Stínění nebo prostorové oddělení zařízení." },
    ],
  },
  {
    id: "AM-9",
    section: "A",
    group: AM_GROUP,
    name: "Elektrická pole",
    allowNotConsidered: true,
    levels: [
      { code: "AM-9-1", label: "zanedbatelná úroveň", normal: true },
      { code: "AM-9-2", label: "střední úroveň", normal: false, measure: AM_GENERIC },
      { code: "AM-9-3", label: "vysoká úroveň", normal: false, measure: AM_GENERIC },
      { code: "AM-9-4", label: "velmi vysoká úroveň", normal: false, measure: AM_GENERIC },
    ],
  },
  {
    id: "AM-21",
    section: "A",
    group: AM_GROUP,
    name: "Indukovaná oscilující napětí nebo proudy",
    allowNotConsidered: true,
    levels: [{ code: "AM-21", label: "bez třídění (ČSN EN 61000-4-6)", normal: true }],
  },
  {
    id: "AM-22",
    section: "A",
    group: AM_GROUP,
    name: "Přechodné jevy v nanosekundách",
    allowNotConsidered: true,
    levels: [
      { code: "AM-22-1", label: "zanedbatelná úroveň", normal: true },
      { code: "AM-22-2", label: "střední úroveň", normal: true },
      { code: "AM-22-3", label: "vysoká úroveň (normální zařízení)", normal: true },
      { code: "AM-22-4", label: "velmi vysoká úroveň", normal: false, measure: "Zařízení se zvýšenou odolností proti rychlým přechodným jevům." },
    ],
  },
  {
    id: "AM-23",
    section: "A",
    group: AM_GROUP,
    name: "Přechodné jevy v mikro- a milisekundách (přepětí)",
    help: "U FVE a venkovních vedení obvykle alespoň střední úroveň.",
    allowNotConsidered: true,
    levels: [
      { code: "AM-23-1", label: "kontrolovaná úroveň", normal: true },
      {
        code: "AM-23-2",
        label: "střední úroveň",
        normal: false,
        measure: "Ochrana před přepětím: kategorie odolnosti zařízení a přepěťové ochrany (SPD) podle ČSN 33 2000-4-443 a ČSN 33 2000-5-534.",
      },
      {
        code: "AM-23-3",
        label: "vysoká úroveň",
        normal: false,
        measure: "Ochrana před přepětím: kategorie odolnosti zařízení a přepěťové ochrany (SPD) podle ČSN 33 2000-4-443 a ČSN 33 2000-5-534.",
      },
    ],
  },
  {
    id: "AM-24",
    section: "A",
    group: AM_GROUP,
    name: "Oscilační přechodové jevy",
    allowNotConsidered: true,
    levels: [
      { code: "AM-24-1", label: "střední úroveň", normal: true },
      { code: "AM-24-2", label: "vysoká úroveň", normal: false, measure: "Zařízení se zvýšenou odolností podle ČSN EN 61000-4-12." },
    ],
  },
  {
    id: "AM-25",
    section: "A",
    group: AM_GROUP,
    name: "Vyzařované vysokofrekvenční jevy",
    allowNotConsidered: true,
    levels: [
      { code: "AM-25-1", label: "zanedbatelná úroveň", normal: true },
      { code: "AM-25-2", label: "střední úroveň", normal: true },
      { code: "AM-25-3", label: "vysoká úroveň", normal: false, measure: "Zařízení se zvýšenou odolností proti VF poli (ČSN EN 61000-4-3)." },
    ],
  },
  {
    id: "AM-31",
    section: "A",
    group: AM_GROUP,
    name: "Elektrostatické výboje",
    allowNotConsidered: true,
    levels: [
      { code: "AM-31-1", label: "nízká úroveň", normal: true },
      { code: "AM-31-2", label: "střední úroveň", normal: true },
      { code: "AM-31-3", label: "vysoká úroveň", normal: true },
      { code: "AM-31-4", label: "velmi vysoká úroveň", normal: false, measure: "Zařízení se zvýšenou odolností proti ESD, antistatická opatření." },
    ],
  },
  {
    id: "AM-41",
    section: "A",
    group: AM_GROUP,
    name: "Ionizace",
    allowNotConsidered: true,
    levels: [{ code: "AM-41-1", label: "uvažuje se (bez klasifikace)", normal: false, measure: "Zvláštní ochrana: vzdálenost od zdroje, clony, kryty ze speciálních materiálů." }],
  },
  {
    id: "AN",
    section: "A",
    name: "Sluneční záření",
    allowNotConsidered: true,
    levels: [
      { code: "AN1", label: "nízké (≤ 500 W/m²)", normal: true },
      { code: "AN2", label: "střední (500–700 W/m²)", normal: false, measure: "Materiály odolné UV záření, zohlednit oteplení od slunce." },
      { code: "AN3", label: "vysoké (> 700 W/m²)", normal: false, measure: "Materiály a kabely odolné UV záření, zastínění, zohlednit oteplení od slunce." },
    ],
  },
  {
    id: "AP",
    section: "A",
    name: "Seismické účinky",
    allowNotConsidered: false,
    levels: [
      { code: "AP1", label: "zanedbatelné (≤ 30 Gal)", normal: true },
      { code: "AP2", label: "nízká úroveň (30–300 Gal)", normal: false, measure: "Posoudit seismickou odolnost upevnění zařízení." },
      { code: "AP3", label: "střední úroveň (300–600 Gal)", normal: false, measure: "Posoudit seismickou odolnost upevnění zařízení." },
      { code: "AP4", label: "vysoká úroveň (> 600 Gal)", normal: false, measure: "Posoudit seismickou odolnost upevnění zařízení." },
    ],
  },
  {
    id: "AQ",
    section: "A",
    name: "Bouřková činnost",
    help: "Části instalace umístěné vně budov (např. FV panely na střeše) spadají do AQ3.",
    allowNotConsidered: false,
    levels: [
      { code: "AQ1", label: "zanedbatelná (Ng ≤ 2,5, do 25 bouřkových dní)", normal: true },
      { code: "AQ2", label: "nepřímé ohrožení (Ng > 2,5, nad 25 bouřkových dní)", normal: true },
      {
        code: "AQ3",
        label: "přímé ohrožení (části instalace vně budov)",
        normal: false,
        measure: "Ochrana před bleskem podle souboru ČSN EN 62305 včetně analýzy rizika (ČSN EN 62305-2) a přepěťové ochrany.",
      },
    ],
  },
  {
    id: "AR",
    section: "A",
    name: "Pohyb vzduchu",
    allowNotConsidered: true,
    levels: [
      { code: "AR1", label: "pomalý (≤ 1 m/s)", normal: true },
      { code: "AR2", label: "střední (1–5 m/s)", normal: false, measure: "Ověřit krytí proti unášeným částicím a vliv na chlazení zařízení." },
      { code: "AR3", label: "silný (5–10 m/s)", normal: false, measure: "Ověřit krytí proti unášeným částicím, upevnění vedení a vliv na chlazení." },
    ],
  },
  {
    id: "AS",
    section: "A",
    name: "Vítr",
    allowNotConsidered: true,
    levels: [
      { code: "AS1", label: "malý (≤ 20 m/s)", normal: true },
      { code: "AS2", label: "střední (20–30 m/s)", normal: false, measure: "Dimenzovat upevnění zařízení a vedení na zatížení větrem." },
      { code: "AS3", label: "silný (30–50 m/s)", normal: false, measure: "Dimenzovat upevnění zařízení a vedení na zatížení větrem." },
    ],
  },

  /* ------------------------------ B – Využití ------------------------------ */
  {
    id: "BA",
    section: "B",
    name: "Schopnost osob",
    allowNotConsidered: false,
    levels: [
      { code: "BA1", label: "laici", normal: true },
      { code: "BA2", label: "děti (školky, školy)", normal: false, measure: "Zařízení s krytím alespoň IP2XC; povrchy s teplotou nad 60 °C nepřístupné." },
      { code: "BA3", label: "osoby se zdravotním postižením", normal: false, measure: "Opatření podle povahy postižení (umístění ovládacích prvků, zvýšená ochrana)." },
      {
        code: "BA4",
        label: "osoby poučené (elektrotechnické pracovní prostory)",
        normal: false,
        measure: "Přístup jen poučeným osobám, prostor označit; lze uplatnit ochranu zábranou nebo polohou (ČSN 33 2000-4-41, příloha B).",
      },
      {
        code: "BA5",
        label: "osoby znalé (uzavřené elektrotechnické prostory)",
        normal: false,
        measure: "Uzavřený elektrotechnický prostor přístupný jen znalým osobám, prostor označit a zajistit proti vstupu.",
      },
    ],
  },
  {
    id: "BC",
    section: "B",
    name: "Dotyk osob s potenciálem země",
    allowNotConsidered: false,
    levels: [
      { code: "BC1", label: "žádný (nevodivé prostředí)", normal: true },
      { code: "BC2", label: "příležitostný", normal: true },
      { code: "BC3", label: "častý (vodivé podlahy, mnoho cizích vodivých částí)", normal: false, measure: "Doplňková ochrana proudovým chráničem 30 mA a doplňující ochranné pospojování." },
      { code: "BC4", label: "trvalý (kovové nádoby, kotle)", normal: false, measure: "Ochrana malým napětím SELV/PELV nebo elektrickým oddělením (ČSN 33 2000-7-706)." },
    ],
  },
  {
    id: "BD",
    section: "B",
    name: "Podmínky úniku v případě nebezpečí",
    allowNotConsidered: false,
    levels: [
      { code: "BD1", label: "málo osob, snadný únik", normal: true },
      { code: "BD2", label: "málo osob, obtížný únik (vícepodlažní budovy)", normal: false, measure: "Elektrická zařízení neumisťovat do únikových cest nebo je chránit; vedení v únikových cestách podle PBŘ." },
      { code: "BD3", label: "mnoho osob, snadný únik (kina, obchody)", normal: false, measure: "Zařízení mimo únikové cesty nebo chráněná proti poškození; vedení se sníženou hořlavostí podle PBŘ." },
      { code: "BD4", label: "mnoho osob, obtížný únik (hotely, nemocnice)", normal: false, measure: "Zařízení mimo únikové cesty; vedení se sníženou hořlavostí a funkční integritou podle PBŘ." },
    ],
  },
  {
    id: "BE",
    section: "B",
    name: "Povaha zpracovávaných nebo skladovaných látek",
    allowNotConsidered: false,
    levels: [
      { code: "BE1", label: "bez významného nebezpečí", normal: true },
      { code: "BE2", label: "nebezpečí požáru (hořlavé látky, prach)", normal: false, measure: "Ochrana před požárem podle ČSN 33 2000-4-42 a ČSN 33 2000-4-482 (omezení oteplení, RCD do 300 mA)." },
      { code: "BE3", label: "nebezpečí výbuchu", normal: false, measure: "Zařízení pro prostředí s nebezpečím výbuchu (ČSN EN IEC 60079-14); samostatné určení zón." },
      { code: "BE4", label: "nebezpečí kontaminace (potraviny, léky)", normal: false, measure: "Ochrana proti kontaminaci, např. kryty svítidel proti padajícím úlomkům." },
    ],
  },

  /* ------------------------------ C – Konstrukce ------------------------------ */
  {
    id: "CA",
    section: "C",
    name: "Stavební materiály",
    allowNotConsidered: false,
    levels: [
      { code: "CA1", label: "nehořlavé", normal: true },
      { code: "CA2", label: "hořlavé (dřevostavby)", normal: false, measure: "Instalace na hořlavých podkladech podle ČSN 33 2000-4-42 (krabice a rozvodnice určené pro hořlavé podklady)." },
    ],
  },
  {
    id: "CB",
    section: "C",
    name: "Konstrukce budovy",
    allowNotConsidered: false,
    levels: [
      { code: "CB1", label: "zanedbatelné nebezpečí", normal: true },
      { code: "CB2", label: "šíření požáru (komínový efekt, nucené větrání)", normal: false, measure: "Protipožární ucpávky prostupů, vedení se sníženým šířením plamene." },
      { code: "CB3", label: "posun konstrukce (dilatace, nestabilní podloží)", normal: false, measure: "Dilatační úseky a pohyblivá připojení vedení." },
      { code: "CB4", label: "poddajná nebo nestabilní konstrukce (stany, podhledy)", normal: false, measure: "Ohebná vedení, konstrukčně samonosná instalace." },
    ],
  },
];

export const VV_BY_ID: Record<string, VvInfluence> = Object.fromEntries(VV_CATALOG.map((i) => [i.id, i]));

/** Vyhledá úroveň podle kódu (např. „AD4“). */
export function findLevel(influenceId: string, code: string): VvLevel | undefined {
  return VV_BY_ID[influenceId]?.levels.find((l) => l.code === code);
}

/** Normy uváděné jako podklady (lze upravit v protokolu). */
export const DEFAULT_BASIS = [
  "ČSN 33 2000-1 ed. 2",
  "ČSN 33 2000-4-41 ed. 3",
  "ČSN 33 2000-5-51 ed. 3 + Z1 + Z2",
];

export const NORM_REFERENCE = "ČSN 33 2000-5-51 ed. 3 + Z1 + Z2";
