/**
 * Referenční případ z protokolu OEZ Prozik 2.60 – SO102 MŠ Tichá, Jablonec n. N. (protokol 17. 6. 2026,
 * zpracovatel Filip Holesz). Vstupy přepsány z protokolu (.doc) a souboru projektu (.vyr).
 *
 * Vynechán systém „Datové vedení“ na vedení NN – ARONLINE dovoluje jen jeden systém na vedení
 * (viz docs/prozik-comparison.md). Proto se srovnávají jen složky, které tento systém neovlivňuje.
 */
import type { Ed2Input } from "../methodologies/csn-en-62305-2-ed2/schema";

const T = (key: string) => ({ source: "table" as const, key });
const zoneBase = {
  floor: "agricultural_concrete" as const,
  pta: ["none" as const],
  ptu: "none" as const,
  fireRisk: "fire_ordinary" as const,
  fireProvisions: "manual" as const,
  shieldExternal: { wm: null, continuous: false },
  shieldInternal: { wm: null, continuous: false },
  l2: null,
  l3: null,
};

export const TICHA: Ed2Input = {
  structure: { L: 63, W: 29, H: 7.2, prominentHeight: null, cd: "surrounded_same_or_lower", lps: "lps_iv", totalPersons: 100, totalServedUsers: null },
  lightning: { mode: "td", ng: null, td: 24, tdMethod: "csn_332000_4_443", source: "Prozik" },
  lossTypes: { L1: true, L2: false, L3: false, L4: true },
  options: { l1InternalSystemsEndangerLife: false, l4Animals: true },
  tolerableL4: null,
  lines: [
    { id: "nn", name: "Distribuční síť NN", service: "power", installation: "buried", lineType: "lv_tlc", environment: "urban", lengthM: 1000, shielding: "multi_grounded_neutral", shieldResistance: null, peb: "lpl_iii_iv", adjacentStructure: null },
    { id: "fve", name: "Rozvody FVE", service: "power", installation: "aerial", lineType: "lv_tlc", environment: "urban", lengthM: 80, shielding: "aerial_unshielded", shieldResistance: null, peb: "lpl_iii_iv", adjacentStructure: null },
  ],
  zones: [
    {
      ...zoneBase, id: "z0", name: "LPZ0b", location: "outside", persons: 100, hoursPerYear: 8760, specialHazard: "panic_average",
      l1: { lt: T("all"), lf: { source: "custom", value: 0, note: "neuvažuje se" }, lo: null },
      l4: { lt: T("animals"), lf: T("hotel_school_office_church_entertainment_commercial"), lo: T("museum_agriculture_school_church_entertainment"), shareAnimals: 1, shareTotal: 1, shareSystems: 1 },
      internalSystems: [],
    },
    {
      ...zoneBase, id: "z1", name: "LPZ1", location: "inside", persons: 100, hoursPerYear: 8760, specialHazard: "panic_high",
      l1: { lt: T("all"), lf: T("hospital_hotel_school_civic"), lo: null },
      l4: { lt: T("animals"), lf: T("hotel_school_office_church_entertainment_commercial"), lo: T("museum_agriculture_school_church_entertainment"), shareAnimals: 1, shareTotal: 1, shareSystems: 1 },
      internalSystems: [
        { id: "nn", name: "Vedení NN", lineId: "nn", uw: "2.5", ks3: "unshielded_avoid_large_loops", pspd: "lpl_iii_iv" },
        // { id: "data", ... } – ARONLINE nepovoluje 2 systémy na jednom vedení
        { id: "fve", name: "FVE", lineId: "fve", uw: "4", ks3: "unshielded_no_precaution", pspd: "lpl_iii_iv" },
      ],
    },
  ],
} as unknown as Ed2Input;

/** Hodnoty z protokolu Prozik (×10⁻⁵), součet zón. */
export const PROZIK_TICHA = {
  L1: { RA: 0.0308, RB: 0.7703, RC: 0, RM: 0, RU: 0.0025, RV: 0.123, RW: 0, RZ: 0, total: 0.9265 },
  L4: { RA: 0.0308, RB: 0.1541, RC: 0.7703, RM: 0.6406, RU: 0.0025, RV: 0.0246, RW: 0.4274, RZ: 25.494, total: 27.5445 },
};

