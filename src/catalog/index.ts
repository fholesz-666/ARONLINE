/**
 * Katalog předvoleb pro projektanta.
 *
 * Předvolby jen PŘEDVYPLŇUJÍ volby z normových tabulek (klíče řádků) a běžné praktické hodnoty.
 * Nejsou to univerzálně správné hodnoty pro každou stavbu – projektant je musí potvrdit.
 * Každá položka nese `basis`: z čeho předvolba vychází.
 */
import type { Ed2Input, InternalSystemInput, LineInput, ZoneInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";

export type BuildingTypeKey =
  | "family_house"
  | "apartment_building"
  | "office"
  | "school"
  | "hospital"
  | "hotel"
  | "retail"
  | "industrial"
  | "warehouse"
  | "agricultural_animals"
  | "museum_heritage"
  | "church"
  | "assembly"
  | "explosion_risk"
  | "public_service"
  | "other";

export interface BuildingTypePreset {
  key: BuildingTypeKey;
  label: string;
  group: string;
  description: string;
  lossTypes: Ed2Input["lossTypes"];
  options: Ed2Input["options"];
  /** Klíč řádku tab. C.2 (LF pro L1) */
  l1Lf: string;
  /** Klíč řádku tab. C.2 (LO pro L1) – jen pokud porucha systémů ohrožuje život */
  l1Lo: string | null;
  l4Lf: string;
  l4Lo: string;
  l2?: { lf: string; lo: string };
  fireRisk: ZoneInput["fireRisk"];
  specialHazard: ZoneInput["specialHazard"];
  fireProvisions: ZoneInput["fireProvisions"];
  floor: ZoneInput["floor"];
  typicalPersons: number;
  /** Doplňující otázky formuláře, které mají smysl jen u tohoto typu */
  extraQuestions: ("explosion" | "icu" | "animals" | "heritage" | "public_service" | "panic")[];
  basis: string;
  warnings: string[];
}

const BASIS_C2 = "Klíče řádků tab. C.2 / C.12 ČSN EN 62305-2 ed. 2 podle druhu objektu – zařazení potvrzuje projektant.";

export const BUILDING_TYPES: BuildingTypePreset[] = [
  {
    key: "family_house",
    label: "Rodinný dům",
    group: "Bydlení",
    description: "Samostatný nebo řadový rodinný dům.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "other",
    l1Lo: null,
    l4Lf: "other",
    l4Lo: "other",
    fireRisk: "fire_ordinary",
    specialHazard: "none",
    fireProvisions: "none",
    floor: "asphalt_linoleum_wood",
    typicalPersons: 4,
    extraQuestions: [],
    basis: BASIS_C2,
    warnings: ["Požární riziko ověřte podle požárně bezpečnostního řešení (měrné požární zatížení)."],
  },
  {
    key: "apartment_building",
    label: "Bytový dům",
    group: "Bydlení",
    description: "Vícepodlažní bytový dům.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "other",
    l1Lo: null,
    l4Lf: "other",
    l4Lo: "other",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_low",
    fireProvisions: "manual",
    floor: "asphalt_linoleum_wood",
    typicalPersons: 40,
    extraQuestions: ["panic"],
    basis: BASIS_C2,
    warnings: ["Úroveň paniky (hz) zvolte podle počtu podlaží a osob."],
  },
  {
    key: "office",
    label: "Administrativní budova",
    group: "Občanská vybavenost",
    description: "Kanceláře, úřady.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "industrial_commercial",
    l1Lo: null,
    l4Lf: "hotel_school_office_church_entertainment_commercial",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_low",
    fireProvisions: "manual",
    floor: "marble_ceramic",
    typicalPersons: 50,
    extraQuestions: ["panic"],
    basis: BASIS_C2,
    warnings: ["U L1 ověřte zařazení LF (občanská budova / obchodní objekt / ostatní) – tabulka kancelářské budovy výslovně neuvádí."],
  },
  {
    key: "school",
    label: "Škola, mateřská škola",
    group: "Občanská vybavenost",
    description: "Školská zařízení.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "hospital_hotel_school_civic",
    l1Lo: null,
    l4Lf: "hotel_school_office_church_entertainment_commercial",
    l4Lo: "museum_agriculture_school_church_entertainment",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_average",
    fireProvisions: "manual",
    floor: "marble_ceramic",
    typicalPersons: 200,
    extraQuestions: ["panic"],
    basis: BASIS_C2,
    warnings: ["U MŠ zvažte obtížnou evakuaci (hz) podle věku dětí."],
  },
  {
    key: "hospital",
    label: "Nemocnice, zdravotnické zařízení",
    group: "Občanská vybavenost",
    description: "Lůžková zařízení, operační sály, JIP.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: true, l4Animals: false },
    l1Lf: "hospital_hotel_school_civic",
    l1Lo: "hospital_other",
    l4Lf: "hospital_industrial_museum_agriculture",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    fireRisk: "fire_ordinary",
    specialHazard: "evacuation_difficult",
    fireProvisions: "automatic",
    floor: "marble_ceramic",
    typicalPersons: 300,
    extraQuestions: ["icu", "panic"],
    basis: BASIS_C2,
    warnings: ["JIP a operační sály vyčleňte do samostatné zóny s LO pro JIP/operační sály."],
  },
  {
    key: "hotel",
    label: "Hotel, ubytovací zařízení",
    group: "Občanská vybavenost",
    description: "Hotely, penziony, ubytovny.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "hospital_hotel_school_civic",
    l1Lo: null,
    l4Lf: "hotel_school_office_church_entertainment_commercial",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_low",
    fireProvisions: "manual",
    floor: "gravel_carpet",
    typicalPersons: 80,
    extraQuestions: ["panic"],
    basis: BASIS_C2,
    warnings: [],
  },
  {
    key: "retail",
    label: "Obchod, obchodní centrum",
    group: "Občanská vybavenost",
    description: "Prodejny, nákupní centra.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "industrial_commercial",
    l1Lo: null,
    l4Lf: "hotel_school_office_church_entertainment_commercial",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_average",
    fireProvisions: "manual",
    floor: "marble_ceramic",
    typicalPersons: 150,
    extraQuestions: ["panic"],
    basis: BASIS_C2,
    warnings: [],
  },
  {
    key: "industrial",
    label: "Výrobní hala, průmyslový objekt",
    group: "Výroba a skladování",
    description: "Výroba, dílny, haly (bez nebezpečí výbuchu).",
    lossTypes: { L1: true, L2: false, L3: false, L4: true },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "industrial_commercial",
    l1Lo: null,
    l4Lf: "hospital_industrial_museum_agriculture",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    fireRisk: "fire_ordinary",
    specialHazard: "none",
    fireProvisions: "manual",
    floor: "agricultural_concrete",
    typicalPersons: 30,
    extraQuestions: ["explosion"],
    basis: BASIS_C2,
    warnings: ["Ekonomickou ztrátu L4 posuzujte podle požadavku investora (hodnoty ca, cb, cc, cs)."],
  },
  {
    key: "warehouse",
    label: "Sklad",
    group: "Výroba a skladování",
    description: "Skladové objekty bez nebezpečí výbuchu.",
    lossTypes: { L1: true, L2: false, L3: false, L4: true },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "industrial_commercial",
    l1Lo: null,
    l4Lf: "hospital_industrial_museum_agriculture",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    fireRisk: "fire_high",
    specialHazard: "none",
    fireProvisions: "manual",
    floor: "agricultural_concrete",
    typicalPersons: 5,
    extraQuestions: ["explosion"],
    basis: BASIS_C2,
    warnings: ["Požární riziko skladu závisí na skladovaném materiálu – ověřte v PBŘ."],
  },
  {
    key: "agricultural_animals",
    label: "Zemědělský objekt se zvířaty",
    group: "Výroba a skladování",
    description: "Stáje, kravíny, drůbežárny.",
    lossTypes: { L1: true, L2: false, L3: false, L4: true },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: true },
    l1Lf: "other",
    l1Lo: null,
    l4Lf: "hospital_industrial_museum_agriculture",
    l4Lo: "museum_agriculture_school_church_entertainment",
    fireRisk: "fire_high",
    specialHazard: "none",
    fireProvisions: "none",
    floor: "agricultural_concrete",
    typicalPersons: 2,
    extraQuestions: ["animals"],
    basis: BASIS_C2,
    warnings: ["Ztráta zvířat se posuzuje v rámci L4 (RA4, RU4)."],
  },
  {
    key: "museum_heritage",
    label: "Muzeum, galerie, kulturní památka",
    group: "Kultura",
    description: "Objekty s kulturním dědictvím.",
    lossTypes: { L1: true, L2: false, L3: true, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "entertainment_church_museum",
    l1Lo: null,
    l4Lf: "hospital_industrial_museum_agriculture",
    l4Lo: "museum_agriculture_school_church_entertainment",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_low",
    fireProvisions: "automatic",
    floor: "marble_ceramic",
    typicalPersons: 50,
    extraQuestions: ["heritage", "panic"],
    basis: BASIS_C2,
    warnings: [],
  },
  {
    key: "church",
    label: "Kostel",
    group: "Kultura",
    description: "Sakrální stavby.",
    lossTypes: { L1: true, L2: false, L3: true, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "entertainment_church_museum",
    l1Lo: null,
    l4Lf: "hotel_school_office_church_entertainment_commercial",
    l4Lo: "museum_agriculture_school_church_entertainment",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_average",
    fireProvisions: "none",
    floor: "marble_ceramic",
    typicalPersons: 100,
    extraQuestions: ["heritage", "panic"],
    basis: BASIS_C2,
    warnings: [],
  },
  {
    key: "assembly",
    label: "Shromažďovací prostor (kino, divadlo, sportovní hala)",
    group: "Kultura",
    description: "Prostory pro větší počet osob.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "entertainment_church_museum",
    l1Lo: null,
    l4Lf: "hotel_school_office_church_entertainment_commercial",
    l4Lo: "museum_agriculture_school_church_entertainment",
    fireRisk: "fire_ordinary",
    specialHazard: "panic_average",
    fireProvisions: "manual",
    floor: "marble_ceramic",
    typicalPersons: 500,
    extraQuestions: ["panic"],
    basis: BASIS_C2,
    warnings: ["Nad 1 000 osob zvolte vysokou úroveň paniky."],
  },
  {
    key: "explosion_risk",
    label: "Objekt s nebezpečím výbuchu",
    group: "Zvláštní",
    description: "Sklady hořlavin, plynů, výbušnin; prostory se zónami výbuchu.",
    lossTypes: { L1: true, L2: false, L3: false, L4: true },
    options: { l1InternalSystemsEndangerLife: true, l4Animals: false },
    l1Lf: "explosion",
    l1Lo: "explosion",
    l4Lf: "explosion",
    l4Lo: "explosion",
    fireRisk: "explosion_zone_2_22",
    specialHazard: "none",
    fireProvisions: "manual",
    floor: "agricultural_concrete",
    typicalPersons: 5,
    extraQuestions: ["explosion"],
    basis: BASIS_C2,
    warnings: [
      "Objekty s nebezpečím výbuchu vyžadují podrobné posouzení (dokumentace o ochraně před výbuchem). Předvolba je jen výchozí bod.",
    ],
  },
  {
    key: "public_service",
    label: "Objekt veřejné služby (vodárna, rozvodna, telekomunikace)",
    group: "Zvláštní",
    description: "Objekty, jejichž porucha přeruší službu veřejnosti.",
    lossTypes: { L1: true, L2: true, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "industrial_commercial",
    l1Lo: null,
    l4Lf: "hospital_industrial_museum_agriculture",
    l4Lo: "hospital_industrial_office_hotel_commercial",
    l2: { lf: "gas_water_power", lo: "gas_water_power" },
    fireRisk: "fire_ordinary",
    specialHazard: "none",
    fireProvisions: "manual",
    floor: "agricultural_concrete",
    typicalPersons: 2,
    extraQuestions: ["public_service"],
    basis: BASIS_C2,
    warnings: ["Pro L2 zadejte počet obsluhovaných uživatelů."],
  },
  {
    key: "other",
    label: "Jiný objekt",
    group: "Zvláštní",
    description: "Ruční nastavení všech parametrů.",
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    l1Lf: "other",
    l1Lo: null,
    l4Lf: "other",
    l4Lo: "other",
    fireRisk: "fire_ordinary",
    specialHazard: "none",
    fireProvisions: "none",
    floor: "agricultural_concrete",
    typicalPersons: 10,
    extraQuestions: ["explosion", "panic"],
    basis: BASIS_C2,
    warnings: [],
  },
];

export function buildingType(key: string): BuildingTypePreset {
  return BUILDING_TYPES.find((b) => b.key === key) ?? BUILDING_TYPES[BUILDING_TYPES.length - 1];
}

/* ------------------------------------------------------------------ */
/* Předvolby vedení                                                    */
/* ------------------------------------------------------------------ */

export interface LinePreset {
  key: string;
  label: string;
  group: string;
  help: string;
  values: Omit<LineInput, "id" | "name" | "environment" | "lengthM" | "adjacentStructure">;
  basis: string;
}

export const LINE_PRESETS: LinePreset[] = [
  {
    key: "lv_buried_pen",
    label: "NN přípojka – kabel v zemi (síť TN-C s vícenásobně uzemněným PEN)",
    group: "Silová vedení",
    help: "Typická kabelová přípojka z distribuční sítě NN. Ověřte provedení u distributora / v projektu přípojky.",
    values: {
      service: "power",
      installation: "buried",
      lineType: "lv_tlc",
      shielding: "multi_grounded_neutral",
      shieldResistance: null,
      peb: "none",
    },
    basis: "Tab. A.2 (v zemi), A.3 (NN), B.4 (vícenásobně uzemněný střední vodič).",
  },
  {
    key: "lv_aerial_pen",
    label: "NN přípojka – venkovní vedení (síť TN-C s vícenásobně uzemněným PEN)",
    group: "Silová vedení",
    help: "Přípojka ze sloupu (holé vodiče nebo izolovaný závěsný kabel).",
    values: {
      service: "power",
      installation: "aerial",
      lineType: "lv_tlc",
      shielding: "multi_grounded_neutral",
      shieldResistance: null,
      peb: "none",
    },
    basis: "Tab. A.2 (venkovní), A.3 (NN), B.4.",
  },
  {
    key: "lv_buried_unshielded",
    label: "NN kabel v zemi – nestíněný (bez údaje o PEN)",
    group: "Silová vedení",
    help: "Konzervativní volba, pokud provedení sítě není známo.",
    values: {
      service: "power",
      installation: "buried",
      lineType: "lv_tlc",
      shielding: "buried_unshielded",
      shieldResistance: null,
      peb: "none",
    },
    basis: "Tab. A.2, A.3, B.4 (nestíněné vedení v zemi).",
  },
  {
    key: "hv_buried_transformer",
    label: "VN přípojka s vlastní trafostanicí – kabel v zemi",
    group: "Silová vedení",
    help: "Objekt napájený z vlastní trafostanice VN/NN.",
    values: {
      service: "power",
      installation: "buried",
      lineType: "hv_with_transformer",
      shielding: "shielded_buried_not_bonded",
      shieldResistance: null,
      peb: "none",
    },
    basis: "Tab. A.3 (VN s transformátorem), B.4 – provedení stínění ověřte.",
  },
  {
    key: "tlc_buried_unshielded",
    label: "Telekomunikační kabel v zemi – metalický, nestíněný",
    group: "Telekomunikace a data",
    help: "Metalická přípojka (např. xDSL).",
    values: {
      service: "tlc",
      installation: "buried",
      lineType: "lv_tlc",
      shielding: "buried_unshielded",
      shieldResistance: null,
      peb: "none",
    },
    basis: "Tab. A.2, A.3, B.4.",
  },
  {
    key: "tlc_buried_shield_bonded",
    label: "Telekomunikační kabel v zemi – stínění spojené s přípojnicí",
    group: "Telekomunikace a data",
    help: "Stínění kabelu je na vstupu do objektu spojeno s hlavní ochrannou přípojnicí. Zadejte odpor stínění RS.",
    values: {
      service: "tlc",
      installation: "buried",
      lineType: "lv_tlc",
      shielding: "shielded_buried_bonded",
      shieldResistance: "rs_5_20",
      peb: "none",
    },
    basis: "Tab. B.4, B.8 – odpor stínění podle katalogu kabelu.",
  },
  {
    key: "tlc_aerial_unshielded",
    label: "Telekomunikační vedení venkovní – nestíněné",
    group: "Telekomunikace a data",
    help: "Závěsný metalický kabel ze sloupu.",
    values: {
      service: "tlc",
      installation: "aerial",
      lineType: "lv_tlc",
      shielding: "aerial_unshielded",
      shieldResistance: null,
      peb: "none",
    },
    basis: "Tab. A.2, B.4.",
  },
];

export const NON_METALLIC_NOTE =
  "Optické kabely bez kovových prvků (bez kovového pláště a nosných prvků) se jako vedení nezadávají.";

/* ------------------------------------------------------------------ */
/* Předvolby vnitřních systémů                                         */
/* ------------------------------------------------------------------ */

export interface SystemPreset {
  key: string;
  label: string;
  help: string;
  values: Pick<InternalSystemInput, "uw" | "ks3" | "pspd">;
  service: "power" | "tlc" | "none";
  basis: string;
}

const UW_BASIS =
  "UW podle kategorie přepětí zařízení (ČSN 33 2000-4-443 / ČSN EN 60664-1 pro síť 230/400 V) – ověřte podle dokumentace zařízení.";

export const SYSTEM_PRESETS: SystemPreset[] = [
  {
    key: "power_general",
    label: "Silnoproudá instalace – běžné spotřebiče (kat. přepětí II, 2,5 kV)",
    help: "Zásuvkové a světelné obvody, domácí spotřebiče.",
    values: { uw: "2.5", ks3: "unshielded_no_precaution", pspd: "none" },
    service: "power",
    basis: UW_BASIS,
  },
  {
    key: "power_fixed",
    label: "Pevná instalace, rozvaděče (kat. přepětí III, 4 kV)",
    help: "Zařízení pevné instalace – rozvaděče, motory.",
    values: { uw: "4", ks3: "unshielded_no_precaution", pspd: "none" },
    service: "power",
    basis: UW_BASIS,
  },
  {
    key: "power_sensitive",
    label: "Citlivá elektronika (kat. přepětí I, 1,5 kV)",
    help: "Výpočetní technika, řídicí systémy, zdravotnická elektronika.",
    values: { uw: "1.5", ks3: "unshielded_avoid_large_loops", pspd: "none" },
    service: "power",
    basis: UW_BASIS,
  },
  {
    key: "pv_inverter",
    label: "Fotovoltaická elektrárna – střídač a rozvody (UW podle střídače)",
    help: "Střídač připojený k síti NN. UW zadejte podle technického listu střídače, DC rozvody FVE posuďte samostatně podle ČSN EN 62305-3 / ČSN 33 2000-7-712.",
    values: { uw: "2.5", ks3: "unshielded_avoid_large_loops", pspd: "none" },
    service: "power",
    basis: "Předvolba UW je orientační – nutno ověřit podle dokumentace střídače.",
  },
  {
    key: "tlc_equipment",
    label: "Telekomunikační / datová zařízení (1,5 kV)",
    help: "Modem, router, ústředna, EZS.",
    values: { uw: "1.5", ks3: "unshielded_avoid_loops", pspd: "none" },
    service: "tlc",
    basis: "UW telekomunikačních zařízení ověřte podle dokumentace výrobce.",
  },
  {
    key: "standalone",
    label: "Samostatný systém bez vnějšího vedení",
    help: "Např. bateriový systém nebo vnitřní rozvody bez propojení ven (uvažuje se jen vliv úderu do blízkosti).",
    values: { uw: "1.5", ks3: "unshielded_no_precaution", pspd: "none" },
    service: "none",
    basis: "Tab. B.4 – bez připojení k vnějšímu vedení.",
  },
];
