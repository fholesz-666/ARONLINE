/**
 * Předvolby typických prostor. Jde o výchozí návrh hodnot – komise je vždy posoudí a upraví.
 */
import { NOT_CONSIDERED, VV_CATALOG } from "./catalog";

export type VvValues = Record<string, string>;

/** Vnitřní prostor s normálními vlivy (výchozí stav). */
export const BASE_INDOOR: VvValues = {
  AA: "AA5",
  AB: "AB5",
  AC: "AC1",
  AD: "AD1",
  AE: "AE1",
  AF: "AF1",
  AG: "AG1",
  AH: "AH1",
  AK: "AK1",
  AL: "AL1",
  "AM-1": "AM-1-2",
  "AM-2": "AM-2-2",
  "AM-3": "AM-3-2",
  "AM-4": NOT_CONSIDERED,
  "AM-5": NOT_CONSIDERED,
  "AM-6": NOT_CONSIDERED,
  "AM-7": NOT_CONSIDERED,
  "AM-8": "AM-8-1",
  "AM-9": "AM-9-1",
  "AM-21": "AM-21",
  "AM-22": "AM-22-1",
  "AM-23": "AM-23-1",
  "AM-24": NOT_CONSIDERED,
  "AM-25": "AM-25-1",
  "AM-31": "AM-31-1",
  "AM-41": NOT_CONSIDERED,
  AN: "AN1",
  AP: "AP1",
  AQ: "AQ1",
  AR: "AR1",
  AS: NOT_CONSIDERED,
  BA: "BA1",
  BC: "BC2",
  BD: "BD1",
  BE: "BE1",
  CA: "CA1",
  CB: "CB1",
};

const OUTDOOR: VvValues = {
  AA: "AA7",
  AB: "AB8",
  AD: "AD4",
  AE: "AE4",
  AF: "AF2",
  AK: "AK2",
  AL: "AL2",
  "AM-23": "AM-23-2",
  AN: "AN3",
  AQ: "AQ3",
  AR: "AR2",
  AS: "AS1",
};

export interface VvPreset {
  id: string;
  label: string;
  /** Poznámka zobrazená u prostoru (např. odkaz na zvláštní normu) */
  note?: string;
  values: VvValues;
}

export const VV_PRESETS: VvPreset[] = [
  { id: "normal", label: "Obytná místnost / kancelář (normální)", values: {} },
  { id: "kitchen", label: "Kuchyň", values: { AB: "AB4", AD: "AD2" } },
  {
    id: "bathroom",
    label: "Koupelna / sprcha",
    note: "Zóny a krytí zařízení podle ČSN 33 2000-7-701 ed. 2.",
    values: { AB: "AB4", AD: "AD4", BC: "BC3" },
  },
  { id: "basement", label: "Sklep / suterén", values: { AA: "AA4", AB: "AB4", AD: "AD2", BC: "BC3" } },
  { id: "attic", label: "Půda / nevytápěné podkroví", values: { AA: "AA7", AB: "AB7", AE: "AE4", AL: "AL2" } },
  { id: "garage", label: "Garáž", values: { AA: "AA4", AB: "AB4", AD: "AD2", AE: "AE4", AF: "AF3", AG: "AG2", BC: "BC3" } },
  { id: "boiler", label: "Kotelna", values: { AA: "AA4", AB: "AB4", AE: "AE4", AF: "AF3" } },
  {
    id: "pv-tech",
    label: "Technická místnost FVE (střídač, baterie)",
    note: "Instalace FVE podle ČSN 33 2000-7-712 ed. 2.",
    values: { AA: "AA4", AB: "AB4", AE: "AE2", "AM-23": "AM-23-2", BA: "BA4" },
  },
  {
    id: "switchroom",
    label: "Elektrorozvodna / uzavřený elektrotechnický prostor",
    values: { AA: "AA4", AB: "AB4", BA: "BA5" },
  },
  {
    id: "pv-roof",
    label: "Střecha s fotovoltaickými panely",
    note: "Instalace FVE podle ČSN 33 2000-7-712 ed. 2; ochrana před bleskem podle ČSN EN 62305.",
    values: { ...OUTDOOR, AS: "AS2" },
  },
  {
    id: "outdoor",
    label: "Venkovní prostor",
    values: { ...OUTDOOR, BC: "BC3" },
  },
  { id: "workshop", label: "Dílna", values: { AB: "AB4", AE: "AE3", AG: "AG2", AH: "AH2", BC: "BC3", BE: "BE2" } },
  { id: "children", label: "Prostor pro děti (školka, škola)", values: { BA: "BA2", BD: "BD3" } },
  { id: "assembly", label: "Prostor přístupný veřejnosti (obchod, kino)", values: { BD: "BD3" } },
  { id: "wood", label: "Místnost v dřevostavbě", values: { CA: "CA2" } },
];

/** Úplné hodnoty prostoru podle předvolby (doplní chybějící vlivy výchozími). */
export function presetValues(presetId: string | undefined): VvValues {
  const p = VV_PRESETS.find((x) => x.id === presetId);
  const out: VvValues = { ...BASE_INDOOR, ...(p?.values ?? {}) };
  // pojistka: každý vliv z katalogu má hodnotu
  for (const inf of VV_CATALOG) {
    if (!out[inf.id]) out[inf.id] = inf.allowNotConsidered ? NOT_CONSIDERED : inf.levels[0].code;
  }
  return out;
}
