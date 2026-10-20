/**
 * Vstupní schéma výpočtu podle ČSN EN 62305-2 ed. 2.
 * Schéma používá server (autoritativní validace) i formulář na klientu.
 */
import { z } from "zod";
import {
  TABLE_CD,
  TABLE_CE,
  TABLE_CI,
  TABLE_CLD_CLI,
  TABLE_CT,
  TABLE_HZ,
  TABLE_KS3,
  TABLE_PB,
  TABLE_PSPD,
  TABLE_PTA,
  TABLE_PTU,
  TABLE_RF,
  TABLE_RP,
  TABLE_RT_FLOOR,
  UW_VALUES,
} from "./tables";

function keysOf<T extends Record<string, unknown>>(rows: T) {
  return Object.keys(rows) as [keyof T & string, ...(keyof T & string)[]];
}

export const zCd = z.enum(keysOf(TABLE_CD.rows));
export const zCi = z.enum(keysOf(TABLE_CI.rows));
export const zCt = z.enum(keysOf(TABLE_CT.rows));
export const zCe = z.enum(keysOf(TABLE_CE.rows));
export const zPta = z.enum(keysOf(TABLE_PTA.rows));
export const zPb = z.enum(keysOf(TABLE_PB.rows));
export const zSpd = z.enum(keysOf(TABLE_PSPD.rows));
export const zCl = z.enum(keysOf(TABLE_CLD_CLI.rows));
export const zKs3 = z.enum(keysOf(TABLE_KS3.rows));
export const zPtu = z.enum(keysOf(TABLE_PTU.rows));
export const zRtFloor = z.enum(keysOf(TABLE_RT_FLOOR.rows));
export const zRp = z.enum(keysOf(TABLE_RP.rows));
export const zRf = z.enum(keysOf(TABLE_RF.rows));
export const zHz = z.enum(keysOf(TABLE_HZ.rows));
export const zUw = z.enum(UW_VALUES);
export const zShieldResistance = z.enum(["rs_5_20", "rs_1_5", "rs_le_1"]);

const id = z.string().trim().min(1).max(40);
const name = z.string().trim().max(160);
const meters = (max: number) => z.number().finite().positive().max(max);
const share = z.number().finite().min(0).max(1);

/** Hodnota ztráty: buď řádek normové tabulky, nebo vlastní hodnota se zdůvodněním. */
export const zLossValue = z.discriminatedUnion("source", [
  z.object({ source: z.literal("table"), key: z.string().min(1).max(80) }),
  z.object({
    source: z.literal("custom"),
    value: z.number().finite().min(0).max(1),
    note: z.string().trim().min(3, "Uveďte zdůvodnění vlastní hodnoty").max(500),
  }),
]);
export type LossValueInput = z.infer<typeof zLossValue>;

/** Nejvyšší počet sousedních objektů připojených vedením (NDJ). */
export const MAX_ADJACENT_STRUCTURES = 5;

export const zAdjacentStructure = z.object({
  L: meters(2000),
  W: meters(2000),
  H: meters(500),
  cd: zCd,
});

export const zLine = z.object({
  id,
  name,
  /** Druh vedení pro tab. B.9 (PLI): silové / telekomunikační. */
  service: z.enum(["power", "tlc"]),
  installation: zCi,
  lineType: zCt,
  environment: zCe,
  /** Délka úseku LL v m; null = neznámá → použije se 1 000 m. */
  lengthM: z.number().finite().positive().max(100000).nullable(),
  /** Řádek tab. B.4 (stínění, uzemnění, izolace). */
  shielding: zCl,
  /** Odpor stínění RS – jen pro stínění spojené s přípojnicí (tab. B.8). */
  shieldResistance: zShieldResistance.nullable(),
  /** SPD pro vyrovnání potenciálů na vstupu vedení (tab. B.7 – PEB). */
  peb: zSpd,
  /**
   * Měrný odpor půdy ρ (Ω·m) u vedení v zemi – volitelná korekce AL = 40·LL·√(ρ/400)
   * (pozn. 2 k čl. A.4: AL je úměrná √ρ, tabulka A.2 vychází z ρ = 400 Ω·m). null = bez korekce.
   */
  soilResistivity: z.number().finite().positive().max(100000).nullable().optional(),
  /** Sousední objekt na druhém konci vedení (pro NDJ); null = žádný / neuvažuje se. */
  adjacentStructure: zAdjacentStructure.nullable(),
});
export type LineInput = z.infer<typeof zLine>;

export const zInternalSystem = z.object({
  id,
  name,
  /** Vedení, ke kterému je systém připojen; null = bez vnějšího vedení. */
  lineId: z.string().max(40).nullable(),
  /** Impulzní výdržné napětí zařízení UW (kV). */
  uw: zUw,
  /** Provedení vnitřní kabeláže (tab. B.5 – KS3). */
  ks3: zKs3,
  /** Koordinovaný systém SPD (tab. B.3 – PSPD). */
  pspd: zSpd,
  /** Zařízení nevyhovuje výrobkovým normám z hlediska odolnosti / výdržného napětí → PM = 1 (čl. B.5). */
  nonCompliant: z.boolean().optional(),
});
export type InternalSystemInput = z.infer<typeof zInternalSystem>;

export const zShield = z.object({
  /** Šířka oka mřížového stínění wm (m); null = bez stínění. */
  wm: z.number().finite().positive().max(100).nullable(),
  /** Spojité kovové stínění tloušťky alespoň 0,1 mm. */
  continuous: z.boolean(),
});

export const zZone = z.object({
  id,
  name,
  location: z.enum(["inside", "outside"]),
  /** nz – počet osob v zóně (L1). */
  persons: z.number().finite().min(0).max(1e6),
  /** tz – doba přítomnosti osob v zóně (h/rok). */
  hoursPerYear: z.number().finite().min(0).max(8760),
  floor: zRtFloor,
  pta: z.array(zPta).min(1).max(5),
  ptu: zPtu,
  fireRisk: zRf,
  fireProvisions: zRp,
  specialHazard: zHz,
  l1: z.object({ lt: zLossValue, lf: zLossValue, lo: zLossValue.nullable() }),
  l2: z
    .object({
      lf: zLossValue,
      lo: zLossValue,
      /** nz pro L2 – počet uživatelů obsluhovaných zónou. */
      servedUsers: z.number().finite().min(0),
    })
    .nullable(),
  l3: z.object({ lf: zLossValue, valueShare: share }).nullable(),
  l4: z
    .object({
      lt: zLossValue.nullable(),
      lf: zLossValue,
      lo: zLossValue,
      /** ca/ct – podíl hodnoty zvířat. */
      shareAnimals: share,
      /** (ca + cb + cc + cs)/ct – podíl hodnoty zóny. */
      shareTotal: share,
      /** cs/ct – podíl hodnoty vnitřních systémů. */
      shareSystems: share,
    })
    .nullable(),
  /** Vnější prostorové stínění (KS1) – mřížová LPS / konstrukce. */
  shieldExternal: zShield,
  /** Vnitřní prostorové stínění (KS2). */
  shieldInternal: zShield,
  internalSystems: z.array(zInternalSystem).max(20),
});
export type ZoneInput = z.infer<typeof zZone>;

export const zEd2Input = z
  .object({
    structure: z.object({
      L: meters(2000),
      W: meters(2000),
      H: meters(500),
      /** Výška vyčnívající části Hp (m); null = objekt bez výrazně vyčnívající části. */
      prominentHeight: z.number().finite().positive().max(1000).nullable(),
      cd: zCd,
      lps: zPb,
      /** nt – celkový počet osob v objektu (L1). */
      totalPersons: z.number().finite().min(0).max(1e6),
      /** nt pro L2 – celkový počet obsluhovaných uživatelů. */
      totalServedUsers: z.number().finite().min(0).nullable(),
    }),
    lightning: z.object({
      mode: z.enum(["ng", "td"]),
      ng: z.number().finite().positive().max(100).nullable(),
      td: z.number().finite().positive().max(365).nullable(),
      /**
       * Přepočet Td → NG: "annex_a" = NG ≈ 0,1·Td (ČSN EN 62305-2 ed. 2, příl. A),
       * "csn_332000_4_443" = NG = 0,04·Td^1,25 (ČSN 33 2000-4-443 ed. 2, čl. 443.3.2.1 – postup programu Prozik).
       */
      tdMethod: z.enum(["annex_a", "csn_332000_4_443"]).optional(),
      source: z.string().trim().min(3, "Uveďte zdroj hodnoty NG / Td").max(300),
    }),
    lossTypes: z.object({ L1: z.boolean(), L2: z.boolean(), L3: z.boolean(), L4: z.boolean() }),
    options: z.object({
      /** Do R1 zahrnout RC, RM, RW, RZ (nebezpečí výbuchu, nemocnice, ohrožení života poruchou systémů). */
      l1InternalSystemsEndangerLife: z.boolean(),
      /** U L4 mohou být ztracena zvířata (zahrnout RA4, RU4). */
      l4Animals: z.boolean(),
    }),
    /** Vlastní přípustné riziko pro L4 (stanoví investor); null = typická hodnota. */
    tolerableL4: z.number().finite().positive().max(1).nullable(),
    lines: z.array(zLine).max(20),
    zones: z.array(zZone).min(1).max(20),
  })
  .superRefine((v, ctx) => {
    if (v.lightning.mode === "ng" && v.lightning.ng == null) {
      ctx.addIssue({ code: "custom", path: ["lightning", "ng"], message: "Zadejte hustotu výbojů NG" });
    }
    if (v.lightning.mode === "td" && v.lightning.td == null) {
      ctx.addIssue({ code: "custom", path: ["lightning", "td"], message: "Zadejte počet bouřkových dnů Td" });
    }
    if (!v.lossTypes.L1 && !v.lossTypes.L2 && !v.lossTypes.L3 && !v.lossTypes.L4) {
      ctx.addIssue({ code: "custom", path: ["lossTypes"], message: "Vyberte alespoň jeden druh ztráty" });
    }
    // Sousední objekty se uvažují jen na konci připojeného vedení (NDJ); max. 5 (shodně s praxí Prozik).
    const adjacentCount = v.lines.filter((l) => l.adjacentStructure != null).length;
    if (adjacentCount > MAX_ADJACENT_STRUCTURES) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: `Lze uvažovat nejvýše ${MAX_ADJACENT_STRUCTURES} sousedních objektů připojených vedením (zadáno ${adjacentCount}).`,
      });
    }
    const lineIds = new Set<string>();
    v.lines.forEach((l, i) => {
      if (lineIds.has(l.id)) ctx.addIssue({ code: "custom", path: ["lines", i, "id"], message: "Duplicitní ID vedení" });
      lineIds.add(l.id);
    });
    v.lines.forEach((l, i) => {
      const bonded =
        l.shielding === "shielded_buried_bonded" ||
        l.shielding === "shielded_aerial_bonded" ||
        l.shielding === "lightning_protective_cable";
      if (bonded && l.shieldResistance == null) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", i, "shieldResistance"],
          message: "U stínění spojeného s přípojnicí zadejte odpor stínění RS (tab. B.8)",
        });
      }
    });
    const zoneIds = new Set<string>();
    v.zones.forEach((z, zi) => {
      if (z.pta.includes("none") && z.pta.length > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["zones", zi, "pta"],
          message: "Volbu „bez ochranných opatření“ nelze kombinovat s jinými opatřeními",
        });
      }
      if (new Set(z.pta).size !== z.pta.length) {
        ctx.addIssue({ code: "custom", path: ["zones", zi, "pta"], message: "Opatření je vybráno vícekrát" });
      }
      // Více systémů na jednom vedení je přípustné – pro RU, RV, RW, RZ se bere nejhorší hodnota parametru (čl. 6.9.1).
      if (zoneIds.has(z.id)) ctx.addIssue({ code: "custom", path: ["zones", zi, "id"], message: "Duplicitní ID zóny" });
      zoneIds.add(z.id);
      z.internalSystems.forEach((s, si) => {
        if (s.lineId != null && !lineIds.has(s.lineId)) {
          ctx.addIssue({
            code: "custom",
            path: ["zones", zi, "internalSystems", si, "lineId"],
            message: "Systém odkazuje na neexistující vedení",
          });
        }
      });
      if (v.lossTypes.L2 && z.l2 == null)
        ctx.addIssue({ code: "custom", path: ["zones", zi, "l2"], message: "Chybí údaje ztrát L2" });
      if (v.lossTypes.L3 && z.l3 == null)
        ctx.addIssue({ code: "custom", path: ["zones", zi, "l3"], message: "Chybí údaje ztrát L3" });
      if (v.lossTypes.L4 && z.l4 == null)
        ctx.addIssue({ code: "custom", path: ["zones", zi, "l4"], message: "Chybí údaje ztrát L4" });
      if (v.lossTypes.L1 && v.options.l1InternalSystemsEndangerLife && z.l1.lo == null)
        ctx.addIssue({ code: "custom", path: ["zones", zi, "l1", "lo"], message: "Chybí hodnota LO pro L1" });
      if (v.lossTypes.L4 && v.options.l4Animals && z.l4 != null && z.l4.lt == null)
        ctx.addIssue({ code: "custom", path: ["zones", zi, "l4", "lt"], message: "Chybí hodnota LT pro L4 (zvířata)" });
    });
    if (v.lossTypes.L1 && v.structure.totalPersons <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["structure", "totalPersons"],
        message: "Pro ztrátu L1 zadejte celkový počet osob nt > 0",
      });
    }
    if (v.lossTypes.L2 && !(v.structure.totalServedUsers != null && v.structure.totalServedUsers > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["structure", "totalServedUsers"],
        message: "Pro ztrátu L2 zadejte celkový počet obsluhovaných uživatelů nt > 0",
      });
    }
  });

export type Ed2Input = z.infer<typeof zEd2Input>;
