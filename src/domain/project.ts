/**
 * Struktura dat projektu (stav průvodce). Sdílí ji klient i server.
 *
 * - `identification` – údaje do razítka a titulní strany
 * - `site`           – automaticky zjištěná data o objektu a okolí (s původem)
 * - `calc`           – rozpracovaný vstup výpočtu (po dokončení odpovídá zEd2Input)
 * - `provenance`     – původ jednotlivých hodnot vstupu (auto / ruční / předvolba) a potvrzení
 */
import { z } from "zod";
import { buildingType, type BuildingTypeKey } from "@/catalog";
import type { Ed2Input, ZoneInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";

const str = (max = 300) => z.string().trim().max(max);
const optStr = (max = 300) => str(max).optional().default("");

export const zProcessorData = z.object({
  fullName: optStr(120),
  company: optStr(160),
  ico: optStr(20),
  dic: optStr(20),
  address: optStr(300),
  email: optStr(254),
  phone: optStr(40),
  /** Autorizace (např. ČKAIT) – volitelné */
  authorization: optStr(120),
  /** Text razítka / doplňující řádek */
  stampNote: optStr(200),
  /** Vzhled dokumentu */
  appearance: z
    .object({
      accentColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default("#1f4e79"),
      headerText: optStr(120),
      footerText: optStr(200),
      showLogoOnCover: z.boolean().default(true),
    })
    .default({}),
});
export type ProcessorData = z.infer<typeof zProcessorData>;

export const DOC_STAGES = ["Studie", "DUR", "DSP", "DUSP", "DPS", "DSPS", "Jiný"] as const;
export const DOC_STAGE_LABELS: Record<(typeof DOC_STAGES)[number], string> = {
  Studie: "Studie",
  DUR: "DUR – dokumentace pro územní rozhodnutí",
  DSP: "DSP – dokumentace pro stavební povolení",
  DUSP: "DUSP – dokumentace pro povolení stavby",
  DPS: "DPS – dokumentace pro provádění stavby",
  DSPS: "DSPS – dokumentace skutečného provedení",
  Jiný: "Jiný",
};

export const zIdentification = z.object({
  projectName: optStr(200),
  jobNumber: optStr(60),
  docStage: z.enum(DOC_STAGES).default("DPS"),
  date: optStr(10),
  revision: optStr(20),
  investor: z
    .object({ name: optStr(200), ico: optStr(20), address: optStr(300) })
    .default({}),
  building: z
    .object({ name: optStr(200), address: optStr(300), parcel: optStr(200), cadastralArea: optStr(120) })
    .default({}),
  processorProfileId: z.string().max(60).nullable().default(null),
  /** Úpravy údajů zpracovatele jen pro tento projekt */
  processorOverride: zProcessorData.partial().nullable().default(null),
  notes: optStr(2000),
});
export type Identification = z.infer<typeof zIdentification>;

/** Původ hodnoty. */
export const zFieldMeta = z.object({
  origin: z.enum(["auto", "manual", "preset", "default"]),
  source: str(300).optional(),
  retrievedAt: str(40).optional(),
  quality: z.enum(["measured", "estimated", "unknown"]).optional(),
  confirmed: z.boolean().default(false),
  note: str(500).optional(),
});
export type FieldMeta = z.infer<typeof zFieldMeta>;

const zLonLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const zSite = z.object({
  query: optStr(300),
  location: z.object({ lon: z.number(), lat: z.number() }).nullable().default(null),
  address: z.object({ text: str(300), code: str(40).optional() }).nullable().default(null),
  parcel: z.object({ label: str(120), cadastralArea: str(120).optional() }).nullable().default(null),
  building: z
    .object({
      id: str(80),
      footprint: z.array(zLonLat).max(2000),
      area: z.number().nonnegative().optional(),
      length: z.number().nonnegative().optional(),
      width: z.number().nonnegative().optional(),
      orientationDeg: z.number().optional(),
      heightEstimate: z.number().nullable().optional(),
      terrainElevation: z.number().nullable().optional(),
      source: str(300),
    })
    .nullable()
    .default(null),
  neighbours: z
    .array(
      z.object({
        id: str(80),
        footprint: z.array(zLonLat).max(2000),
        distance: z.number().nonnegative(),
        heightEstimate: z.number().nullable().optional(),
        heightManual: z.number().nonnegative().nullable().optional(),
        include: z.boolean().default(true),
      }),
    )
    .max(200)
    .default([]),
  dataNotes: z.array(str(500)).max(50).default([]),
});
export type Site = z.infer<typeof zSite>;

export const zProjectData = z.object({
  schemaVersion: z.literal(1).default(1),
  buildingType: z.string().max(40).default("family_house"),
  identification: zIdentification.default({}),
  site: zSite.default({}),
  /** Rozpracovaný vstup výpočtu – plně se validuje až při výpočtu. */
  calc: z.record(z.unknown()).default({}),
  provenance: z.record(z.string().max(200), zFieldMeta).default({}),
  /** Poslední dokončený krok průvodce */
  lastStep: z.number().int().min(0).max(20).default(0),
});
export type ProjectData = z.infer<typeof zProjectData>;

/** Výchozí zóna vnitřku objektu podle typu objektu. */
export function defaultInsideZone(typeKey: BuildingTypeKey | string): ZoneInput {
  const t = buildingType(typeKey);
  return {
    id: "z-inside",
    name: "Vnitřní prostory objektu",
    location: "inside",
    persons: t.typicalPersons,
    hoursPerYear: 8760,
    floor: t.floor,
    pta: ["none"],
    ptu: "none",
    fireRisk: t.fireRisk,
    fireProvisions: t.fireProvisions,
    specialHazard: t.specialHazard,
    l1: {
      lt: { source: "table", key: "all" },
      lf: { source: "table", key: t.l1Lf },
      lo: t.l1Lo ? { source: "table", key: t.l1Lo } : null,
    },
    l2: t.l2
      ? { lf: { source: "table", key: t.l2.lf }, lo: { source: "table", key: t.l2.lo }, servedUsers: 1000 }
      : null,
    l3: t.lossTypes.L3 ? { lf: { source: "table", key: "museums_galleries" }, valueShare: 1 } : null,
    l4: {
      lt: t.options.l4Animals ? { source: "table", key: "animals" } : null,
      lf: { source: "table", key: t.l4Lf },
      lo: { source: "table", key: t.l4Lo },
      shareAnimals: t.options.l4Animals ? 1 : 0,
      shareTotal: 1,
      shareSystems: 1,
    },
    shieldExternal: { wm: null, continuous: false },
    shieldInternal: { wm: null, continuous: false },
    internalSystems: [],
  };
}

/** Výchozí rozpracovaný vstup výpočtu pro nový projekt. */
export function defaultCalc(typeKey: BuildingTypeKey | string): Partial<Ed2Input> {
  const t = buildingType(typeKey);
  return {
    structure: {
      L: undefined as unknown as number,
      W: undefined as unknown as number,
      H: undefined as unknown as number,
      prominentHeight: null,
      cd: "surrounded_same_or_lower",
      lps: "none",
      totalPersons: t.typicalPersons,
      totalServedUsers: t.l2 ? 1000 : null,
    },
    lightning: { mode: "ng", ng: null, td: null, source: "" },
    lossTypes: { ...t.lossTypes },
    options: { ...t.options },
    tolerableL4: null,
    lines: [],
    zones: [defaultInsideZone(typeKey)],
  };
}

export function newProjectData(typeKey: BuildingTypeKey | string, processorProfileId: string | null): ProjectData {
  const today = new Date().toISOString().slice(0, 10);
  const t = buildingType(typeKey);
  const provenance: ProjectData["provenance"] = {
    "calc.lossTypes": { origin: "preset", source: `Typ objektu: ${t.label}`, confirmed: false },
    "calc.zones[0]": { origin: "preset", source: `Typ objektu: ${t.label} – ${t.basis}`, confirmed: false },
    "calc.structure.totalPersons": { origin: "preset", source: "Typický počet osob pro typ objektu – upravte", confirmed: false },
  };
  return zProjectData.parse({
    buildingType: t.key,
    identification: { date: today, processorProfileId },
    calc: defaultCalc(t.key),
    provenance,
  });
}
