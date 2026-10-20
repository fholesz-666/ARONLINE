/**
 * Normové tabulky – ČSN EN 62305-2 ed. 2:2013 (IEC 62305-2:2010).
 *
 * DŮLEŽITÉ – PŮVOD HODNOT
 * -----------------------
 * Hodnoty přepsal implementátor podle metodiky IEC 62305-2:2010. Text normy nebyl
 * k dispozici, protože norma je placená. Kde existuje veřejný sekundární zdroj se
 * shodnými hodnotami, je uveden v `publicSources`.
 *
 * Žádná hodnota NENÍ ověřena proti textu ČSN. Stav ověření se vede odděleně
 * v `verification.json` a vyplňuje ho odborník s legálně pořízeným textem normy.
 * Postup je popsán v docs/verification-checklist.md.
 *
 * Popisy řádků (label/help) jsou vlastní parafráze, nikoliv citace normy.
 */
import type { NormTable, PublicSource } from "../../types";
export type { NormTable, TableRow } from "../../types";

const DEHN_LPG: PublicSource = {
  title: "DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2",
  url: "https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf",
  checkedAt: "2026-10-20",
};

const PROVENANCE_DEHN =
  "Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.";
const PROVENANCE_MEMORY =
  "Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.";

/* ------------------------------------------------------------------ */
/* Příloha A – počet nebezpečných událostí                              */
/* ------------------------------------------------------------------ */

export type CdKey = "surrounded_higher" | "surrounded_same_or_lower" | "isolated" | "isolated_hilltop";
export const TABLE_CD: NormTable<CdKey> = {
  id: "ED2.TAB.A.1",
  symbol: "CD",
  title: "Součinitel polohy objektu CD",
  normRef: "ČSN EN 62305-2 ed. 2, tab. A.1",
  rows: {
    surrounded_higher: {
      label: "Objekt obklopený vyššími objekty",
      value: 0.25,
      help: "V okolí do vzdálenosti 3H jsou objekty vyšší než posuzovaný objekt.",
    },
    surrounded_same_or_lower: {
      label: "Objekt obklopený objekty stejné nebo nižší výšky",
      value: 0.5,
      help: "Typická zástavba – sousední budovy podobné nebo nižší výšky.",
    },
    isolated: {
      label: "Osamělý objekt (v okolí do 3H nejsou jiné objekty)",
      value: 1,
    },
    isolated_hilltop: {
      label: "Osamělý objekt na vrcholu kopce nebo pahorku",
      value: 2,
    },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.3.1" }],
  provenance: PROVENANCE_DEHN,
};

export type CiKey = "aerial" | "buried" | "buried_meshed";
export const TABLE_CI: NormTable<CiKey> = {
  id: "ED2.TAB.A.2",
  symbol: "CI",
  title: "Součinitel instalace vedení CI",
  normRef: "ČSN EN 62305-2 ed. 2, tab. A.2",
  rows: {
    aerial: { label: "Venkovní (nadzemní) vedení", value: 1 },
    buried: { label: "Vedení uložené v zemi", value: 0.5 },
    buried_meshed: {
      label: "Kabel v zemi vedený celou délkou uvnitř mřížové uzemňovací soustavy",
      value: 0.01,
      help: "Mřížová uzemňovací soustava podle ČSN EN 62305-4.",
    },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.3.2" }],
  provenance: PROVENANCE_DEHN,
};

export type CtKey = "lv_tlc" | "hv_with_transformer";
export const TABLE_CT: NormTable<CtKey> = {
  id: "ED2.TAB.A.3",
  symbol: "CT",
  title: "Součinitel typu vedení CT",
  normRef: "ČSN EN 62305-2 ed. 2, tab. A.3",
  rows: {
    lv_tlc: { label: "Silové vedení NN, telekomunikační nebo datové vedení", value: 1 },
    hv_with_transformer: { label: "Silové vedení VN (s transformátorem VN/NN)", value: 0.2 },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.3.3" }],
  provenance: PROVENANCE_DEHN,
};

export type CeKey = "rural" | "suburban" | "urban" | "urban_tall";
export const TABLE_CE: NormTable<CeKey> = {
  id: "ED2.TAB.A.4",
  symbol: "CE",
  title: "Součinitel prostředí vedení CE",
  normRef: "ČSN EN 62305-2 ed. 2, tab. A.4",
  rows: {
    rural: { label: "Venkovské prostředí", value: 1 },
    suburban: { label: "Předměstské prostředí", value: 0.5 },
    urban: { label: "Městské prostředí", value: 0.1 },
    urban_tall: { label: "Městské prostředí s budovami vyššími než 20 m", value: 0.01 },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.3.4" }],
  provenance: PROVENANCE_DEHN,
};

/* ------------------------------------------------------------------ */
/* Příloha B – pravděpodobnosti škody                                   */
/* ------------------------------------------------------------------ */

export type PtaKey = "none" | "warning_notices" | "insulation" | "soil_equipotential" | "physical_restrictions";
export const TABLE_PTA: NormTable<PtaKey> = {
  id: "ED2.TAB.B.1",
  symbol: "PTA",
  title: "Pravděpodobnost PTA úrazu dotykovým a krokovým napětím (úder do objektu)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.1",
  rows: {
    none: { label: "Bez ochranných opatření", value: 1 },
    warning_notices: { label: "Výstražné tabulky", value: 0.1 },
    insulation: {
      label: "Elektrická izolace přístupných částí (např. svodů)",
      value: 0.01,
      help: "Např. izolace ze zesíťovaného polyetylenu tloušťky alespoň 3 mm.",
    },
    soil_equipotential: { label: "Účinné vyrovnání potenciálu v zemi", value: 0.01 },
    physical_restrictions: {
      label: "Fyzické zábrany nebo konstrukce budovy využitá jako soustava svodů",
      value: 0,
    },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.4.1" }],
  provenance:
    PROVENANCE_DEHN +
    " Při více opatřeních se hodnoty násobí (pravidlo uvedené u tabulky – ověřit).",
};

export type PbKey =
  | "none"
  | "lps_iv"
  | "lps_iii"
  | "lps_ii"
  | "lps_i"
  | "lps_i_framework"
  | "metal_roof_framework";
export const TABLE_PB: NormTable<PbKey> = {
  id: "ED2.TAB.B.2",
  symbol: "PB",
  title: "Pravděpodobnost PB hmotné škody podle ochranných opatření (LPS)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.2",
  rows: {
    none: { label: "Objekt není chráněn LPS", value: 1 },
    lps_iv: { label: "LPS třídy IV", value: 0.2 },
    lps_iii: { label: "LPS třídy III", value: 0.1 },
    lps_ii: { label: "LPS třídy II", value: 0.05 },
    lps_i: { label: "LPS třídy I", value: 0.02 },
    lps_i_framework: {
      label: "Jímací soustava odpovídající LPS I a spojitá kovová nebo železobetonová konstrukce jako náhodný svod",
      value: 0.01,
    },
    metal_roof_framework: {
      label:
        "Kovová střecha a jímací soustava (i náhodné součásti) s úplnou ochranou střešních instalací a spojitá kovová nebo železobetonová konstrukce jako náhodný svod",
      value: 0.001,
    },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.4.2" }],
  provenance: PROVENANCE_DEHN,
};

export type SpdLplKey = "none" | "lpl_iii_iv" | "lpl_ii" | "lpl_i" | "better_0005" | "better_0001";
export const TABLE_PSPD: NormTable<SpdLplKey> = {
  id: "ED2.TAB.B.3",
  symbol: "PSPD",
  title: "Pravděpodobnost PSPD podle LPL, pro kterou je navržen koordinovaný systém SPD",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.3",
  rows: {
    none: { label: "Bez koordinovaného systému SPD", value: 1 },
    lpl_iii_iv: { label: "Koordinované SPD pro LPL III–IV", value: 0.05 },
    lpl_ii: { label: "Koordinované SPD pro LPL II", value: 0.02 },
    lpl_i: { label: "Koordinované SPD pro LPL I", value: 0.01 },
    better_0005: {
      label: "SPD s lepšími parametry než pro LPL I – horní mez rozsahu",
      value: 0.005,
      help: "Poznámka k tabulce připouští rozsah 0,005–0,001 podle parametrů SPD (ověřit podmínky).",
    },
    better_0001: {
      label: "SPD s lepšími parametry než pro LPL I – dolní mez rozsahu",
      value: 0.001,
      help: "Použít jen při doložení parametrů SPD podle poznámky k tabulce.",
    },
  },
  publicSources: [{ ...DEHN_LPG, locator: "tab. 3.2.4.3" }],
  provenance: PROVENANCE_DEHN,
};

export type ClKey =
  | "aerial_unshielded"
  | "buried_unshielded"
  | "multi_grounded_neutral"
  | "shielded_buried_not_bonded"
  | "shielded_aerial_not_bonded"
  | "shielded_buried_bonded"
  | "shielded_aerial_bonded"
  | "lightning_protective_cable"
  | "no_external_line"
  | "isolating_interface";
export const TABLE_CLD_CLI: NormTable<ClKey, { cld: number; cli: number }> = {
  id: "ED2.TAB.B.4",
  symbol: "CLD/CLI",
  title: "Součinitele CLD a CLI podle stínění, uzemnění a izolace vedení",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.4",
  rows: {
    aerial_unshielded: { label: "Nestíněné venkovní vedení", value: { cld: 1, cli: 1 } },
    buried_unshielded: { label: "Nestíněné vedení v zemi", value: { cld: 1, cli: 1 } },
    multi_grounded_neutral: {
      label: "Silové vedení s vícenásobně uzemněným středním vodičem (PEN)",
      value: { cld: 1, cli: 0.2 },
    },
    shielded_buried_not_bonded: {
      label: "Stíněné vedení v zemi – stínění NENÍ spojeno se stejnou ekvipotenciální přípojnicí jako zařízení",
      value: { cld: 1, cli: 0.3 },
    },
    shielded_aerial_not_bonded: {
      label: "Stíněné venkovní vedení – stínění NENÍ spojeno se stejnou ekvipotenciální přípojnicí jako zařízení",
      value: { cld: 1, cli: 0.1 },
    },
    shielded_buried_bonded: {
      label: "Stíněné vedení v zemi – stínění spojeno se stejnou ekvipotenciální přípojnicí jako zařízení",
      value: { cld: 1, cli: 0 },
    },
    shielded_aerial_bonded: {
      label: "Stíněné venkovní vedení – stínění spojeno se stejnou ekvipotenciální přípojnicí jako zařízení",
      value: { cld: 1, cli: 0 },
    },
    lightning_protective_cable: {
      label: "Bleskově odolný kabel nebo vedení v kovovém kanálu/trubce spojeném s ekvipotenciální přípojnicí",
      value: { cld: 0, cli: 0 },
    },
    no_external_line: {
      label: "Bez připojení k vnějšímu vedení (samostatný systém)",
      value: { cld: 0, cli: 0 },
    },
    isolating_interface: {
      label: "Libovolné vedení s oddělovacím rozhraním podle ČSN EN 62305-4",
      value: { cld: 0, cli: 0 },
    },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type Ks3Key =
  | "unshielded_no_precaution"
  | "unshielded_avoid_large_loops"
  | "unshielded_avoid_loops"
  | "shielded_bonded";
export const TABLE_KS3: NormTable<Ks3Key> = {
  id: "ED2.TAB.B.5",
  symbol: "KS3",
  title: "Součinitel KS3 podle provedení vnitřní kabeláže",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.5",
  rows: {
    unshielded_no_precaution: {
      label: "Nestíněný kabel bez opatření proti smyčkám (plocha smyčky řádově 50 m²)",
      value: 1,
    },
    unshielded_avoid_large_loops: {
      label: "Nestíněný kabel, trasy volené proti velkým smyčkám (plocha smyčky řádově 10 m²)",
      value: 0.2,
    },
    unshielded_avoid_loops: {
      label: "Nestíněný kabel, vodiče ve společném kabelu (plocha smyčky řádově 0,5 m²)",
      value: 0.01,
    },
    shielded_bonded: {
      label: "Stíněné kabely nebo kabely v kovových trubkách, stínění spojeno na obou koncích s ekvipotenciální přípojnicí",
      value: 0.0001,
    },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type PtuKey = "none" | "warning_notices" | "insulation" | "physical_restrictions";
export const TABLE_PTU: NormTable<PtuKey> = {
  id: "ED2.TAB.B.6",
  symbol: "PTU",
  title: "Pravděpodobnost PTU úrazu dotykovým napětím (úder do vedení)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.6",
  rows: {
    none: { label: "Bez ochranných opatření", value: 1 },
    warning_notices: { label: "Výstražné tabulky", value: 0.1 },
    insulation: { label: "Elektrická izolace", value: 0.01 },
    physical_restrictions: { label: "Fyzické zábrany", value: 0 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export const TABLE_PEB: NormTable<SpdLplKey> = {
  id: "ED2.TAB.B.7",
  symbol: "PEB",
  title: "Pravděpodobnost PEB podle LPL, pro kterou jsou navrženy SPD pro vyrovnání potenciálů",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.7",
  rows: {
    none: { label: "Bez SPD pro vyrovnání potenciálů", value: 1 },
    lpl_iii_iv: { label: "SPD pro LPL III–IV", value: 0.05 },
    lpl_ii: { label: "SPD pro LPL II", value: 0.02 },
    lpl_i: { label: "SPD pro LPL I", value: 0.01 },
    better_0005: { label: "SPD s lepšími parametry než pro LPL I – horní mez rozsahu", value: 0.005 },
    better_0001: { label: "SPD s lepšími parametry než pro LPL I – dolní mez rozsahu", value: 0.001 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

/** Impulzní výdržné napětí zařízení UW (kV) – sloupce tabulek B.8 a B.9. */
export const UW_VALUES = ["1", "1.5", "2.5", "4", "6"] as const;
export type UwKey = (typeof UW_VALUES)[number];

export type PldKey =
  | "unshielded_or_not_bonded"
  | "bonded_rs_5_20"
  | "bonded_rs_1_5"
  | "bonded_rs_le_1";
export const TABLE_PLD: NormTable<PldKey, Record<UwKey, number>> = {
  id: "ED2.TAB.B.8",
  symbol: "PLD",
  title: "Pravděpodobnost PLD podle odporu stínění RS a výdržného napětí UW",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.8",
  rows: {
    unshielded_or_not_bonded: {
      label: "Nestíněné vedení, nebo stínění není spojeno se stejnou přípojnicí jako zařízení",
      value: { "1": 1, "1.5": 1, "2.5": 1, "4": 1, "6": 1 },
    },
    bonded_rs_5_20: {
      label: "Stínění spojené se stejnou přípojnicí jako zařízení, 5 Ω/km < RS ≤ 20 Ω/km",
      value: { "1": 1, "1.5": 1, "2.5": 0.95, "4": 0.9, "6": 0.8 },
    },
    bonded_rs_1_5: {
      label: "Stínění spojené se stejnou přípojnicí jako zařízení, 1 Ω/km < RS ≤ 5 Ω/km",
      value: { "1": 0.9, "1.5": 0.8, "2.5": 0.6, "4": 0.3, "6": 0.1 },
    },
    bonded_rs_le_1: {
      label: "Stínění spojené se stejnou přípojnicí jako zařízení, RS ≤ 1 Ω/km",
      value: { "1": 0.6, "1.5": 0.4, "2.5": 0.2, "4": 0.04, "6": 0.02 },
    },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type PliKey = "power" | "tlc";
export const TABLE_PLI: NormTable<PliKey, Record<UwKey, number>> = {
  id: "ED2.TAB.B.9",
  symbol: "PLI",
  title: "Pravděpodobnost PLI podle typu vedení a výdržného napětí UW",
  normRef: "ČSN EN 62305-2 ed. 2, tab. B.9",
  rows: {
    power: { label: "Silová vedení", value: { "1": 1, "1.5": 0.6, "2.5": 0.3, "4": 0.16, "6": 0.1 } },
    tlc: { label: "Telekomunikační vedení", value: { "1": 1, "1.5": 0.5, "2.5": 0.2, "4": 0.08, "6": 0.04 } },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

/* ------------------------------------------------------------------ */
/* Příloha C – ztráty                                                  */
/* ------------------------------------------------------------------ */

export type L1LfKey =
  | "explosion"
  | "hospital_hotel_school_civic"
  | "entertainment_church_museum"
  | "industrial_commercial"
  | "other";
export type L1LoKey = "explosion" | "icu_operating" | "hospital_other";

export const TABLE_L1_LT: NormTable<"all"> = {
  id: "ED2.TAB.C.2.LT",
  symbol: "LT",
  title: "L1 – typická střední hodnota LT (úraz dotykovým a krokovým napětím)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.2",
  rows: { all: { label: "Všechny typy objektů", value: 0.01 } },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export const TABLE_L1_LF: NormTable<L1LfKey> = {
  id: "ED2.TAB.C.2.LF",
  symbol: "LF",
  title: "L1 – typická střední hodnota LF (fyzická škoda)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.2",
  rows: {
    explosion: { label: "Nebezpečí výbuchu", value: 0.1 },
    hospital_hotel_school_civic: { label: "Nemocnice, hotel, škola, občanská budova", value: 0.1 },
    entertainment_church_museum: { label: "Veřejná zábava, kostel, muzeum", value: 0.05 },
    industrial_commercial: { label: "Průmyslový, obchodní objekt", value: 0.02 },
    other: { label: "Ostatní (např. obytné budovy)", value: 0.01 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export const TABLE_L1_LO: NormTable<L1LoKey> = {
  id: "ED2.TAB.C.2.LO",
  symbol: "LO",
  title: "L1 – typická střední hodnota LO (porucha vnitřních systémů)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.2",
  rows: {
    explosion: { label: "Nebezpečí výbuchu", value: 0.1 },
    icu_operating: { label: "Jednotka intenzivní péče a operační sály nemocnice", value: 0.01 },
    hospital_other: { label: "Ostatní části nemocnice", value: 0.001 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type RtKey = "agricultural_concrete" | "marble_ceramic" | "gravel_carpet" | "asphalt_linoleum_wood";
export const TABLE_RT_FLOOR: NormTable<RtKey> = {
  id: "ED2.TAB.C.3",
  symbol: "rt",
  title: "Redukční součinitel rt podle povrchu země nebo podlahy",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.3",
  rows: {
    agricultural_concrete: { label: "Zemědělská půda, beton (přechodový odpor ≤ 1 kΩ)", value: 0.01 },
    marble_ceramic: { label: "Mramor, keramika (1–10 kΩ)", value: 0.001 },
    gravel_carpet: { label: "Štěrk, koberec, textilní podlaha (10–100 kΩ)", value: 0.0001 },
    asphalt_linoleum_wood: { label: "Asfalt, linoleum, dřevo (≥ 100 kΩ)", value: 0.00001 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type RpKey = "none" | "manual" | "automatic";
export const TABLE_RP: NormTable<RpKey> = {
  id: "ED2.TAB.C.4",
  symbol: "rp",
  title: "Redukční součinitel rp podle opatření ke zmírnění následků požáru",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.4",
  rows: {
    none: { label: "Žádná opatření", value: 1 },
    manual: {
      label:
        "Jedno z opatření: hasicí přístroje, ručně ovládané stabilní hasicí zařízení, ruční hlásiče požáru, hydranty, požární úseky, únikové cesty",
      value: 0.5,
    },
    automatic: {
      label:
        "Jedno z opatření: automatické stabilní hasicí zařízení, automatická elektrická požární signalizace (chráněná proti přepětí, s dojezdem hasičů do 10 min)",
      value: 0.2,
    },
  },
  publicSources: [],
  provenance:
    PROVENANCE_MEMORY + " Při více opatřeních se použije nejnižší hodnota (pravidlo u tabulky – ověřit).",
};

export type RfKey =
  | "explosion_zone_0_20"
  | "explosion_zone_1_21"
  | "explosion_zone_2_22"
  | "fire_high"
  | "fire_ordinary"
  | "fire_low"
  | "none";
export const TABLE_RF: NormTable<RfKey> = {
  id: "ED2.TAB.C.5",
  symbol: "rf",
  title: "Redukční součinitel rf podle nebezpečí požáru nebo výbuchu",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.5",
  rows: {
    explosion_zone_0_20: { label: "Výbuch – zóny 0, 20 a pevné výbušniny", value: 1 },
    explosion_zone_1_21: { label: "Výbuch – zóny 1, 21", value: 0.1 },
    explosion_zone_2_22: { label: "Výbuch – zóny 2, 22", value: 0.001 },
    fire_high: {
      label: "Požár – vysoké nebezpečí",
      value: 0.1,
      help: "Orientačně měrné požární zatížení nad 800 MJ/m² (poznámka u tabulky – ověřit).",
    },
    fire_ordinary: {
      label: "Požár – běžné nebezpečí",
      value: 0.01,
      help: "Orientačně měrné požární zatížení 400–800 MJ/m² (ověřit).",
    },
    fire_low: {
      label: "Požár – malé nebezpečí",
      value: 0.001,
      help: "Orientačně měrné požární zatížení pod 400 MJ/m² (ověřit).",
    },
    none: { label: "Žádné nebezpečí požáru ani výbuchu", value: 0 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type HzKey = "none" | "panic_low" | "panic_average" | "evacuation_difficult" | "panic_high";
export const TABLE_HZ: NormTable<HzKey> = {
  id: "ED2.TAB.C.6",
  symbol: "hz",
  title: "Součinitel hz zvyšující ztrátu při zvláštním nebezpečí",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.6",
  rows: {
    none: { label: "Bez zvláštního nebezpečí", value: 1 },
    panic_low: {
      label: "Nízká úroveň paniky",
      value: 2,
      help: "Např. objekt nejvýše o dvou podlažích a nejvýše 100 osobách.",
    },
    panic_average: {
      label: "Průměrná úroveň paniky",
      value: 5,
      help: "Např. kulturní nebo sportovní akce pro 100 až 1 000 osob.",
    },
    evacuation_difficult: {
      label: "Obtížná evakuace",
      value: 5,
      help: "Např. imobilní osoby, nemocnice.",
    },
    panic_high: {
      label: "Vysoká úroveň paniky",
      value: 10,
      help: "Např. kulturní nebo sportovní akce pro více než 1 000 osob.",
    },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type L2Key = "gas_water_power" | "tv_tlc";
export const TABLE_L2_LF: NormTable<L2Key> = {
  id: "ED2.TAB.C.8.LF",
  symbol: "LF",
  title: "L2 – typická střední hodnota LF (ztráta veřejné služby, fyzická škoda)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.8",
  rows: {
    gas_water_power: { label: "Dodávka plynu, vody, elektrické energie", value: 0.1 },
    tv_tlc: { label: "TV a telekomunikační vedení", value: 0.01 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};
export const TABLE_L2_LO: NormTable<L2Key> = {
  id: "ED2.TAB.C.8.LO",
  symbol: "LO",
  title: "L2 – typická střední hodnota LO (ztráta veřejné služby, porucha systémů)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.8",
  rows: {
    gas_water_power: { label: "Dodávka plynu, vody, elektrické energie", value: 0.01 },
    tv_tlc: { label: "TV a telekomunikační vedení", value: 0.001 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export const TABLE_L3_LF: NormTable<"museums_galleries"> = {
  id: "ED2.TAB.C.10",
  symbol: "LF",
  title: "L3 – typická střední hodnota LF (ztráta kulturního dědictví)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.10",
  rows: { museums_galleries: { label: "Muzea, galerie", value: 0.1 } },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

export type L4LfKey =
  | "explosion"
  | "hospital_industrial_museum_agriculture"
  | "hotel_school_office_church_entertainment_commercial"
  | "other";
export type L4LoKey =
  | "explosion"
  | "hospital_industrial_office_hotel_commercial"
  | "museum_agriculture_school_church_entertainment"
  | "other";
export const TABLE_L4_LT: NormTable<"animals"> = {
  id: "ED2.TAB.C.12.LT",
  symbol: "LT",
  title: "L4 – typická střední hodnota LT (ztráta zvířat)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.12",
  rows: { animals: { label: "Objekty, kde se vyskytují pouze zvířata", value: 0.01 } },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};
export const TABLE_L4_LF: NormTable<L4LfKey> = {
  id: "ED2.TAB.C.12.LF",
  symbol: "LF",
  title: "L4 – typická střední hodnota LF (ekonomická ztráta, fyzická škoda)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.12",
  rows: {
    explosion: { label: "Nebezpečí výbuchu", value: 1 },
    hospital_industrial_museum_agriculture: { label: "Nemocnice, průmysl, muzeum, zemědělství", value: 0.5 },
    hotel_school_office_church_entertainment_commercial: {
      label: "Hotel, škola, kancelářská budova, kostel, veřejná zábava, obchod",
      value: 0.2,
    },
    other: { label: "Ostatní", value: 0.1 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};
export const TABLE_L4_LO: NormTable<L4LoKey> = {
  id: "ED2.TAB.C.12.LO",
  symbol: "LO",
  title: "L4 – typická střední hodnota LO (ekonomická ztráta, porucha systémů)",
  normRef: "ČSN EN 62305-2 ed. 2, tab. C.12",
  rows: {
    explosion: { label: "Nebezpečí výbuchu", value: 0.1 },
    hospital_industrial_office_hotel_commercial: {
      label: "Nemocnice, průmysl, kancelářská budova, hotel, obchod",
      value: 0.01,
    },
    museum_agriculture_school_church_entertainment: {
      label: "Muzeum, zemědělství, škola, kostel, veřejná zábava",
      value: 0.001,
    },
    other: { label: "Ostatní", value: 0.0001 },
  },
  publicSources: [],
  provenance: PROVENANCE_MEMORY,
};

/* ------------------------------------------------------------------ */
/* Přípustné riziko                                                    */
/* ------------------------------------------------------------------ */

export type LossType = "L1" | "L2" | "L3" | "L4";
export const TABLE_RT: NormTable<LossType> = {
  id: "ED2.TAB.T4",
  symbol: "RT",
  title: "Typické hodnoty přípustného rizika RT",
  normRef: "ČSN EN 62305-2 ed. 2, tab. 4 a předmluva",
  rows: {
    L1: { label: "Ztráta lidského života nebo trvalé zranění", value: 1e-5 },
    L2: { label: "Ztráta veřejné služby", value: 1e-3 },
    L3: { label: "Ztráta kulturního dědictví", value: 1e-4 },
    L4: {
      label: "Ztráta ekonomické hodnoty (není-li k dispozici analýza nákladů)",
      value: 1e-3,
      help: "Hodnota uvedená v předmluvě IEC 62305-2:2010 pro případ bez dat pro analýzu nákladů a přínosů.",
    },
  },
  publicSources: [
    {
      title: "IEC 62305-2:2010 – veřejný náhled (předmluva): RT pro L3 sníženo na 10⁻⁴, zavedeno RT = 10⁻³ pro L4",
      url: "https://webstore.ansi.org/preview-pages/IEC/preview_iec62305-2%7Bed2.0%7Den.pdf",
      checkedAt: "2026-10-20",
    },
  ],
  provenance:
    "Hodnoty pro L3 a L4 podle veřejné předmluvy IEC 62305-2:2010. Hodnoty pro L1 a L2 podle znalosti implementátora. Proti textu ČSN neověřeno.",
};

/** Všechny tabulky metodiky – pro kontrolu ověření a otisk dat. */
export const ALL_TABLES: NormTable<string, unknown>[] = [
  TABLE_CD,
  TABLE_CI,
  TABLE_CT,
  TABLE_CE,
  TABLE_PTA,
  TABLE_PB,
  TABLE_PSPD,
  TABLE_CLD_CLI,
  TABLE_KS3,
  TABLE_PTU,
  TABLE_PEB,
  TABLE_PLD,
  TABLE_PLI,
  TABLE_L1_LT,
  TABLE_L1_LF,
  TABLE_L1_LO,
  TABLE_RT_FLOOR,
  TABLE_RP,
  TABLE_RF,
  TABLE_HZ,
  TABLE_L2_LF,
  TABLE_L2_LO,
  TABLE_L3_LF,
  TABLE_L4_LT,
  TABLE_L4_LF,
  TABLE_L4_LO,
  TABLE_RT,
] as NormTable<string, unknown>[];
