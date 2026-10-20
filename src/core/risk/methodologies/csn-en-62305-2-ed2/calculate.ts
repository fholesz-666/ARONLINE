/**
 * Výpočet rizika podle ČSN EN 62305-2 ed. 2:2013 (IEC 62305-2:2010).
 *
 * Čistá funkce: vstup → výsledek se stopou výpočtu. Žádné I/O.
 * Vzorce viz ./equations.ts, tabulky viz ./tables.ts – vše NEOVĚŘENO proti textu ČSN.
 */
import type { CalcMessage, NormTable, TraceInput, TraceStep, ValueSource } from "../../types";
import { fmtNum } from "../../../util/format";
import { EQUATIONS as E } from "./equations";
import type { Ed2Input, InternalSystemInput, LineInput, LossValueInput, ZoneInput } from "./schema";
import * as T from "./tables";
import type { LossType, PldKey, UwKey } from "./tables";

export const COMPONENTS = ["RA", "RB", "RC", "RM", "RU", "RV", "RW", "RZ"] as const;
export type Component = (typeof COMPONENTS)[number];
export type ComponentValues = Record<Component, number>;
export const LOSS_TYPES: LossType[] = ["L1", "L2", "L3", "L4"];

/** Složky zahrnuté do rizika daného druhu ztráty (kap. 4.3). */
export function includedComponents(loss: LossType, input: Pick<Ed2Input, "options">): Component[] {
  switch (loss) {
    case "L1":
      return input.options.l1InternalSystemsEndangerLife
        ? ["RA", "RB", "RC", "RM", "RU", "RV", "RW", "RZ"]
        : ["RA", "RB", "RU", "RV"];
    case "L2":
      return ["RB", "RC", "RM", "RV", "RW", "RZ"];
    case "L3":
      return ["RB", "RV"];
    case "L4":
      return input.options.l4Animals
        ? ["RA", "RB", "RC", "RM", "RU", "RV", "RW", "RZ"]
        : ["RB", "RC", "RM", "RV", "RW", "RZ"];
  }
}

export interface LineResult {
  id: string;
  name: string;
  LL: number;
  lengthAssumed: boolean;
  AL: number;
  AI: number;
  CI: number;
  CE: number;
  CT: number;
  NL: number;
  NI: number;
  ADJ: number | null;
  NDJ: number;
  CLD: number;
  CLI: number;
  PEB: number;
}

export interface SystemResult {
  id: string;
  name: string;
  lineId: string | null;
  UW: number;
  PSPD: number;
  CLD: number;
  CLI: number;
  KS3: number;
  KS4: number;
  PMS: number;
  PCi: number;
  PMi: number;
}

export interface ZoneLineResult {
  lineId: string;
  systemId: string;
  PLD: number;
  PLI: number;
  PU: number;
  PV: number;
  PW: number;
  PZ: number;
}

export type ZoneLosses = Record<"LA" | "LB" | "LC" | "LM" | "LU" | "LV" | "LW" | "LZ", number>;

export interface ZoneResult {
  id: string;
  name: string;
  PTA: number;
  PB: number;
  PA: number;
  PC: number;
  PM: number;
  KS1: number;
  KS2: number;
  systems: SystemResult[];
  lines: ZoneLineResult[];
  losses: Partial<Record<LossType, ZoneLosses>>;
  /** Hodnoty všech složek (i těch, které se do daného rizika nezahrnují). */
  components: Partial<Record<LossType, ComponentValues>>;
}

export interface RiskSummary {
  loss: LossType;
  total: number;
  tolerable: number;
  tolerableSource: "table" | "user";
  exceeds: boolean;
  included: Component[];
  components: ComponentValues;
  perZone: { zoneId: string; zoneName: string; total: number }[];
  /** Složky seřazené podle velikosti s podílem na celku. */
  dominant: { component: Component; value: number; share: number }[];
}

export interface Ed2ScenarioResult {
  scenario: "designed" | "unprotected";
  NG: number;
  structure: {
    ADrect: number;
    ADprominent: number | null;
    AD: number;
    AM: number;
    CD: number;
    ND: number;
    NM: number;
  };
  lines: LineResult[];
  zones: ZoneResult[];
  risks: Partial<Record<LossType, RiskSummary>>;
  trace: TraceStep[];
  messages: CalcMessage[];
}

/* ------------------------------------------------------------------ */

const f = (n: number) => fmtNum(n, 4);

function tableSource(table: NormTable<string, unknown>, rowKey: string): ValueSource {
  return { kind: "table", tableId: table.id, rowKey, normRef: table.normRef };
}

function rowValue<K extends string>(table: NormTable<K>, key: K): number {
  const row = table.rows[key];
  if (!row) throw new Error(`Neznámý řádek ${key} v tabulce ${table.id}`);
  return row.value;
}

interface Resolved {
  value: number;
  source: ValueSource;
}

function resolveLoss(lv: LossValueInput, table: NormTable<string>, path: string, messages: CalcMessage[]): Resolved {
  if (lv.source === "custom") {
    messages.push({
      severity: "info",
      code: "CUSTOM_LOSS_VALUE",
      message: `Vlastní hodnota ${table.symbol} = ${f(lv.value)} (${lv.note}). Odpovědnost za hodnotu nese zpracovatel.`,
      path,
    });
    return { value: lv.value, source: { kind: "user", note: lv.note } };
  }
  const row = (table.rows as Record<string, { value: number } | undefined>)[lv.key];
  if (!row) {
    throw new CalcInputError(`Neplatná volba „${lv.key}“ pro ${table.symbol} (${table.normRef})`, path);
  }
  return { value: row.value, source: tableSource(table, lv.key) };
}

export class CalcInputError extends Error {
  constructor(
    message: string,
    public path?: string,
  ) {
    super(message);
    this.name = "CalcInputError";
  }
}

function pldRowFor(line: LineInput): PldKey {
  switch (line.shielding) {
    case "shielded_buried_bonded":
    case "shielded_aerial_bonded":
    case "lightning_protective_cable":
      switch (line.shieldResistance) {
        case "rs_5_20":
          return "bonded_rs_5_20";
        case "rs_1_5":
          return "bonded_rs_1_5";
        case "rs_le_1":
          return "bonded_rs_le_1";
        default:
          throw new CalcInputError(`Vedení „${line.name}“: chybí odpor stínění RS`, `lines.${line.id}.shieldResistance`);
      }
    default:
      return "unshielded_or_not_bonded";
  }
}

function ksFromShield(shield: ZoneInput["shieldExternal"]): { value: number; formula: string } {
  if (shield.continuous) return { value: 1e-4, formula: "10⁻⁴ (spojité kovové stínění tloušťky ≥ 0,1 mm)" };
  if (shield.wm == null) return { value: 1, formula: "1 (bez prostorového stínění)" };
  const v = Math.min(1, 0.12 * shield.wm);
  return { value: v, formula: `min(1; 0,12 · ${f(shield.wm)})` };
}

/* ------------------------------------------------------------------ */

export function calculateScenario(input: Ed2Input, scenario: "designed" | "unprotected"): Ed2ScenarioResult {
  const trace: TraceStep[] = [];
  const messages: CalcMessage[] = [];
  const step = (s: TraceStep) => {
    trace.push(s);
    return s.value;
  };
  const prefix = scenario === "designed" ? "" : "U:";

  /* --- Hustota výbojů --------------------------------------------- */
  let NG: number;
  if (input.lightning.mode === "td") {
    const TD = input.lightning.td as number;
    NG = step({
      key: prefix + "NG",
      symbol: "NG",
      label: "Hustota výbojů do země (z počtu bouřkových dnů)",
      value: 0.1 * TD,
      unit: "1/(km²·rok)",
      formula: E.NG_FROM_TD.formula,
      substituted: `NG = 0,1 · ${f(TD)}`,
      equationId: E.NG_FROM_TD.id,
      normRef: E.NG_FROM_TD.normRef,
      inputs: [{ symbol: "TD", value: TD, unit: "dny/rok", source: { kind: "user", note: input.lightning.source } }],
    });
    messages.push({
      severity: "warning",
      code: "NG_FROM_TD",
      message: "NG je odvozeno přibližným vztahem z počtu bouřkových dnů. Je-li k dispozici měřená hustota výbojů, použijte ji.",
      path: "lightning.td",
    });
  } else {
    NG = input.lightning.ng as number;
    trace.push({
      key: prefix + "NG",
      symbol: "NG",
      label: "Hustota výbojů do země",
      value: NG,
      unit: "1/(km²·rok)",
      formula: "zadáno",
      substituted: `NG = ${f(NG)}`,
      inputs: [{ symbol: "NG", value: NG, source: { kind: "user", note: input.lightning.source } }],
    });
  }

  const ngInput: TraceInput = {
    symbol: "NG",
    value: NG,
    unit: "1/(km²·rok)",
    source:
      input.lightning.mode === "td"
        ? { kind: "computed", equationId: E.NG_FROM_TD.id }
        : { kind: "user", note: input.lightning.source },
  };

  /* --- Objekt ------------------------------------------------------ */
  const { L, W, H } = input.structure;
  const ADrect = step({
    key: prefix + "AD.rect",
    symbol: "AD",
    label: "Sběrná plocha objektu (pravoúhlý objekt)",
    value: L * W + 2 * (3 * H) * (L + W) + Math.PI * Math.pow(3 * H, 2),
    unit: "m²",
    formula: E.AD.formula,
    substituted: `AD = ${f(L)} · ${f(W)} + 2 · (3 · ${f(H)}) · (${f(L)} + ${f(W)}) + π · (3 · ${f(H)})²`,
    equationId: E.AD.id,
    normRef: E.AD.normRef,
    inputs: [
      { symbol: "L", value: L, unit: "m", source: { kind: "user" } },
      { symbol: "W", value: W, unit: "m", source: { kind: "user" } },
      { symbol: "H", value: H, unit: "m", source: { kind: "user" } },
    ],
  });
  let ADprominent: number | null = null;
  let AD = ADrect;
  if (input.structure.prominentHeight != null) {
    const Hp = input.structure.prominentHeight;
    ADprominent = step({
      key: prefix + "AD.prominent",
      symbol: "AD'",
      label: "Sběrná plocha vyčnívající části objektu",
      value: Math.PI * Math.pow(3 * Hp, 2),
      unit: "m²",
      formula: E.AD_PROMINENT.formula,
      substituted: `AD' = π · (3 · ${f(Hp)})²`,
      equationId: E.AD_PROMINENT.id,
      normRef: E.AD_PROMINENT.normRef,
      inputs: [{ symbol: "Hp", value: Hp, unit: "m", source: { kind: "user" } }],
    });
    AD = Math.max(ADrect, ADprominent);
    trace.push({
      key: prefix + "AD",
      symbol: "AD",
      label: "Sběrná plocha objektu (větší z AD a AD')",
      value: AD,
      unit: "m²",
      formula: "AD = max(AD; AD')",
      substituted: `AD = max(${f(ADrect)}; ${f(ADprominent)})`,
      inputs: [],
      notes: [
        "Pro objekt složitého tvaru se uvažuje větší z ploch – postup pro složité tvary ověřit podle přílohy A normy.",
      ],
    });
    if (Hp <= H) {
      messages.push({
        severity: "warning",
        code: "PROMINENT_NOT_HIGHER",
        message: "Výška vyčnívající části Hp není větší než výška objektu H.",
        path: "structure.prominentHeight",
      });
    }
  }
  const CD = rowValue(T.TABLE_CD, input.structure.cd);
  const ND = step({
    key: prefix + "ND",
    symbol: "ND",
    label: "Počet nebezpečných událostí – úder do objektu",
    value: NG * AD * CD * 1e-6,
    unit: "1/rok",
    formula: E.ND.formula,
    substituted: `ND = ${f(NG)} · ${f(AD)} · ${f(CD)} · 10⁻⁶`,
    equationId: E.ND.id,
    normRef: E.ND.normRef,
    inputs: [
      ngInput,
      { symbol: "AD", value: AD, unit: "m²", source: { kind: "computed", equationId: E.AD.id } },
      {
        symbol: "CD",
        value: CD,
        source: tableSource(T.TABLE_CD, input.structure.cd),
        label: T.TABLE_CD.rows[input.structure.cd].label,
      },
    ],
  });
  const AM = step({
    key: prefix + "AM",
    symbol: "AM",
    label: "Sběrná plocha úderů v blízkosti objektu",
    value: 2 * 500 * (L + W) + Math.PI * 500 * 500,
    unit: "m²",
    formula: E.AM.formula,
    substituted: `AM = 2 · 500 · (${f(L)} + ${f(W)}) + π · 500²`,
    equationId: E.AM.id,
    normRef: E.AM.normRef,
    inputs: [
      { symbol: "L", value: L, unit: "m", source: { kind: "user" } },
      { symbol: "W", value: W, unit: "m", source: { kind: "user" } },
    ],
  });
  const NM = step({
    key: prefix + "NM",
    symbol: "NM",
    label: "Počet nebezpečných událostí – úder v blízkosti objektu",
    value: NG * AM * 1e-6,
    unit: "1/rok",
    formula: E.NM.formula,
    substituted: `NM = ${f(NG)} · ${f(AM)} · 10⁻⁶`,
    equationId: E.NM.id,
    normRef: E.NM.normRef,
    inputs: [
      ngInput,
      { symbol: "AM", value: AM, unit: "m²", source: { kind: "computed", equationId: E.AM.id } },
    ],
  });

  /* --- Vedení ------------------------------------------------------ */
  const lines: LineResult[] = input.lines.map((line, i) => {
    const lp = `${prefix}line:${line.id}.`;
    const lengthAssumed = line.lengthM == null;
    const LL = line.lengthM ?? 1000;
    if (lengthAssumed) {
      messages.push({
        severity: "info",
        code: "LINE_LENGTH_ASSUMED",
        message: `Vedení „${line.name}“: délka úseku není známa, uvažuje se LL = 1 000 m (nepříznivý případ).`,
        path: `lines[${i}].lengthM`,
      });
    } else if (LL > 1000) {
      messages.push({
        severity: "warning",
        code: "LINE_LENGTH_OVER_1000",
        message: `Vedení „${line.name}“: délka úseku ${f(LL)} m přesahuje 1 000 m – ověřte postup normy pro délku úseku vedení.`,
        path: `lines[${i}].lengthM`,
      });
    }
    const CI = rowValue(T.TABLE_CI, line.installation);
    const CE = rowValue(T.TABLE_CE, line.environment);
    const CT = rowValue(T.TABLE_CT, line.lineType);
    const cl = T.TABLE_CLD_CLI.rows[line.shielding].value;
    const PEB = rowValue(T.TABLE_PEB, line.peb);
    const llInput: TraceInput = {
      symbol: "LL",
      value: LL,
      unit: "m",
      source: lengthAssumed ? { kind: "default", note: "neznámá délka – uvažuje se 1 000 m" } : { kind: "user" },
    };
    const AL = step({
      key: lp + "AL",
      symbol: "AL",
      label: `Sběrná plocha úderů do vedení „${line.name}“`,
      value: 40 * LL,
      unit: "m²",
      formula: E.AL.formula,
      substituted: `AL = 40 · ${f(LL)}`,
      equationId: E.AL.id,
      normRef: E.AL.normRef,
      inputs: [llInput],
    });
    const AI = step({
      key: lp + "AI",
      symbol: "AI",
      label: `Sběrná plocha úderů v blízkosti vedení „${line.name}“`,
      value: 4000 * LL,
      unit: "m²",
      formula: E.AI.formula,
      substituted: `AI = 4 000 · ${f(LL)}`,
      equationId: E.AI.id,
      normRef: E.AI.normRef,
      inputs: [llInput],
    });
    const factorInputs: TraceInput[] = [
      { symbol: "CI", value: CI, source: tableSource(T.TABLE_CI, line.installation), label: T.TABLE_CI.rows[line.installation].label },
      { symbol: "CE", value: CE, source: tableSource(T.TABLE_CE, line.environment), label: T.TABLE_CE.rows[line.environment].label },
      { symbol: "CT", value: CT, source: tableSource(T.TABLE_CT, line.lineType), label: T.TABLE_CT.rows[line.lineType].label },
    ];
    const NL = step({
      key: lp + "NL",
      symbol: "NL",
      label: `Počet nebezpečných událostí – úder do vedení „${line.name}“`,
      value: NG * AL * CI * CE * CT * 1e-6,
      unit: "1/rok",
      formula: E.NL.formula,
      substituted: `NL = ${f(NG)} · ${f(AL)} · ${f(CI)} · ${f(CE)} · ${f(CT)} · 10⁻⁶`,
      equationId: E.NL.id,
      normRef: E.NL.normRef,
      inputs: [{ symbol: "AL", value: AL, unit: "m²", source: { kind: "computed", equationId: E.AL.id } }, ...factorInputs],
    });
    const NI = step({
      key: lp + "NI",
      symbol: "NI",
      label: `Počet nebezpečných událostí – úder v blízkosti vedení „${line.name}“`,
      value: NG * AI * CI * CE * CT * 1e-6,
      unit: "1/rok",
      formula: E.NI.formula,
      substituted: `NI = ${f(NG)} · ${f(AI)} · ${f(CI)} · ${f(CE)} · ${f(CT)} · 10⁻⁶`,
      equationId: E.NI.id,
      normRef: E.NI.normRef,
      inputs: [{ symbol: "AI", value: AI, unit: "m²", source: { kind: "computed", equationId: E.AI.id } }, ...factorInputs],
    });
    let ADJ: number | null = null;
    let NDJ = 0;
    if (line.adjacentStructure) {
      const a = line.adjacentStructure;
      ADJ = step({
        key: lp + "ADJ",
        symbol: "ADJ",
        label: `Sběrná plocha sousedního objektu na konci vedení „${line.name}“`,
        value: a.L * a.W + 2 * (3 * a.H) * (a.L + a.W) + Math.PI * Math.pow(3 * a.H, 2),
        unit: "m²",
        formula: E.AD.formula.replace(/AD/g, "ADJ").replace(/\bL\b/g, "LJ").replace(/\bW\b/g, "WJ").replace(/\bH\b/g, "HJ"),
        substituted: `ADJ = ${f(a.L)} · ${f(a.W)} + 2 · (3 · ${f(a.H)}) · (${f(a.L)} + ${f(a.W)}) + π · (3 · ${f(a.H)})²`,
        equationId: E.AD.id,
        normRef: E.AD.normRef,
        inputs: [
          { symbol: "LJ", value: a.L, unit: "m", source: { kind: "user" } },
          { symbol: "WJ", value: a.W, unit: "m", source: { kind: "user" } },
          { symbol: "HJ", value: a.H, unit: "m", source: { kind: "user" } },
        ],
      });
      const CDJ = rowValue(T.TABLE_CD, a.cd);
      NDJ = step({
        key: lp + "NDJ",
        symbol: "NDJ",
        label: `Počet nebezpečných událostí – úder do sousedního objektu (vedení „${line.name}“)`,
        value: NG * ADJ * CDJ * CT * 1e-6,
        unit: "1/rok",
        formula: E.NDJ.formula,
        substituted: `NDJ = ${f(NG)} · ${f(ADJ)} · ${f(CDJ)} · ${f(CT)} · 10⁻⁶`,
        equationId: E.NDJ.id,
        normRef: E.NDJ.normRef,
        inputs: [
          { symbol: "ADJ", value: ADJ, unit: "m²", source: { kind: "computed", equationId: E.AD.id } },
          { symbol: "CDJ", value: CDJ, source: tableSource(T.TABLE_CD, a.cd), label: T.TABLE_CD.rows[a.cd].label },
          factorInputs[2],
        ],
      });
    }
    return {
      id: line.id,
      name: line.name,
      LL,
      lengthAssumed,
      AL,
      AI,
      CI,
      CE,
      CT,
      NL,
      NI,
      ADJ,
      NDJ,
      CLD: cl.cld,
      CLI: cl.cli,
      PEB,
    };
  });
  const lineById = new Map(input.lines.map((l) => [l.id, l]));
  const lineResById = new Map(lines.map((l) => [l.id, l]));

  /* --- Zóny -------------------------------------------------------- */
  const PB = rowValue(T.TABLE_PB, input.structure.lps);
  const zones: ZoneResult[] = input.zones.map((zone, zi) => {
    const zp = `${prefix}zone:${zone.id}.`;
    const zpath = `zones[${zi}]`;

    // PA
    const PTA = zone.pta.reduce((acc, k) => acc * rowValue(T.TABLE_PTA, k), 1);
    const PA = step({
      key: zp + "PA",
      symbol: "PA",
      label: `Pravděpodobnost úrazu dotykovým a krokovým napětím – zóna „${zone.name}“`,
      value: PTA * PB,
      formula: E.PA.formula,
      substituted: `PA = ${f(PTA)} · ${f(PB)}`,
      equationId: E.PA.id,
      normRef: E.PA.normRef,
      inputs: [
        {
          symbol: "PTA",
          value: PTA,
          source: tableSource(T.TABLE_PTA, zone.pta.join("+")),
          label: zone.pta.map((k) => T.TABLE_PTA.rows[k].label).join(" + "),
        },
        { symbol: "PB", value: PB, source: tableSource(T.TABLE_PB, input.structure.lps), label: T.TABLE_PB.rows[input.structure.lps].label },
      ],
      notes: zone.pta.length > 1 ? ["Více opatření – hodnoty PTA vynásobeny."] : undefined,
    });

    // Prostorové stínění
    const ks1 = ksFromShield(zone.shieldExternal);
    const ks2 = ksFromShield(zone.shieldInternal);
    const KS1 = step({
      key: zp + "KS1",
      symbol: "KS1",
      label: `Účinnost vnějšího prostorového stínění – zóna „${zone.name}“`,
      value: ks1.value,
      formula: E.KS1.formula,
      substituted: `KS1 = ${ks1.formula}`,
      equationId: E.KS1.id,
      normRef: E.KS1.normRef,
      inputs: zone.shieldExternal.wm != null ? [{ symbol: "wm1", value: zone.shieldExternal.wm, unit: "m", source: { kind: "user" } }] : [],
    });
    const KS2 = step({
      key: zp + "KS2",
      symbol: "KS2",
      label: `Účinnost vnitřního prostorového stínění – zóna „${zone.name}“`,
      value: ks2.value,
      formula: E.KS2.formula,
      substituted: `KS2 = ${ks2.formula}`,
      equationId: E.KS2.id,
      normRef: E.KS2.normRef,
      inputs: zone.shieldInternal.wm != null ? [{ symbol: "wm2", value: zone.shieldInternal.wm, unit: "m", source: { kind: "user" } }] : [],
    });

    // Vnitřní systémy → PC, PM a složky z vedení
    const systems: SystemResult[] = [];
    const zoneLines: ZoneLineResult[] = [];
    const PTU = rowValue(T.TABLE_PTU, zone.ptu);
    zone.internalSystems.forEach((sys: InternalSystemInput, si) => {
      const sp = `${zp}sys:${sys.id}.`;
      const line = sys.lineId ? lineById.get(sys.lineId) : undefined;
      const lineRes = sys.lineId ? lineResById.get(sys.lineId) : undefined;
      if (sys.lineId && (!line || !lineRes)) {
        throw new CalcInputError(`Systém „${sys.name}“ odkazuje na neexistující vedení`, `${zpath}.internalSystems[${si}].lineId`);
      }
      const clRow = line ? line.shielding : "no_external_line";
      const CLD = T.TABLE_CLD_CLI.rows[clRow].value.cld;
      const CLI = T.TABLE_CLD_CLI.rows[clRow].value.cli;
      const PSPD = rowValue(T.TABLE_PSPD, sys.pspd);
      const UW = parseFloat(sys.uw);
      const KS3 = rowValue(T.TABLE_KS3, sys.ks3);
      const KS4 = step({
        key: sp + "KS4",
        symbol: "KS4",
        label: `Součinitel KS4 – systém „${sys.name}“`,
        value: 1 / UW,
        formula: E.KS4.formula,
        substituted: `KS4 = 1 / ${f(UW)}`,
        equationId: E.KS4.id,
        normRef: E.KS4.normRef,
        inputs: [{ symbol: "UW", value: UW, unit: "kV", source: { kind: "user" } }],
      });
      const PMS = step({
        key: sp + "PMS",
        symbol: "PMS",
        label: `Pravděpodobnost PMS – systém „${sys.name}“`,
        value: Math.pow(KS1 * KS2 * KS3 * KS4, 2),
        formula: E.PMS.formula,
        substituted: `PMS = (${f(KS1)} · ${f(KS2)} · ${f(KS3)} · ${f(KS4)})²`,
        equationId: E.PMS.id,
        normRef: E.PMS.normRef,
        inputs: [
          { symbol: "KS1", value: KS1, source: { kind: "computed", equationId: E.KS1.id } },
          { symbol: "KS2", value: KS2, source: { kind: "computed", equationId: E.KS2.id } },
          { symbol: "KS3", value: KS3, source: tableSource(T.TABLE_KS3, sys.ks3), label: T.TABLE_KS3.rows[sys.ks3].label },
          { symbol: "KS4", value: KS4, source: { kind: "computed", equationId: E.KS4.id } },
        ],
      });
      const PCi = step({
        key: sp + "PC",
        symbol: "PCi",
        label: `Pravděpodobnost poruchy vnitřního systému (úder do objektu) – „${sys.name}“`,
        value: PSPD * CLD,
        formula: E.PC.formula,
        substituted: `PC = ${f(PSPD)} · ${f(CLD)}`,
        equationId: E.PC.id,
        normRef: E.PC.normRef,
        inputs: [
          { symbol: "PSPD", value: PSPD, source: tableSource(T.TABLE_PSPD, sys.pspd), label: T.TABLE_PSPD.rows[sys.pspd].label },
          { symbol: "CLD", value: CLD, source: tableSource(T.TABLE_CLD_CLI, clRow), label: T.TABLE_CLD_CLI.rows[clRow].label },
        ],
      });
      const PMi = step({
        key: sp + "PM",
        symbol: "PMi",
        label: `Pravděpodobnost poruchy vnitřního systému (úder v blízkosti) – „${sys.name}“`,
        value: PSPD * PMS,
        formula: E.PM.formula,
        substituted: `PM = ${f(PSPD)} · ${f(PMS)}`,
        equationId: E.PM.id,
        normRef: E.PM.normRef,
        inputs: [
          { symbol: "PSPD", value: PSPD, source: tableSource(T.TABLE_PSPD, sys.pspd) },
          { symbol: "PMS", value: PMS, source: { kind: "computed", equationId: E.PMS.id } },
        ],
      });
      systems.push({ id: sys.id, name: sys.name, lineId: sys.lineId, UW, PSPD, CLD, CLI, KS3, KS4, PMS, PCi, PMi });

      if (line && lineRes) {
        const pldRow = pldRowFor(line);
        const uwKey = sys.uw as UwKey;
        const PLD = T.TABLE_PLD.rows[pldRow].value[uwKey];
        const PLI = T.TABLE_PLI.rows[line.service].value[uwKey];
        const lineInputs: TraceInput[] = [
          { symbol: "PEB", value: lineRes.PEB, source: tableSource(T.TABLE_PEB, line.peb), label: T.TABLE_PEB.rows[line.peb].label },
          { symbol: "PLD", value: PLD, source: tableSource(T.TABLE_PLD, `${pldRow}@${uwKey}kV`), label: T.TABLE_PLD.rows[pldRow].label },
          { symbol: "CLD", value: CLD, source: tableSource(T.TABLE_CLD_CLI, clRow) },
        ];
        const lp = `${sp}line:${line.id}.`;
        const PU = step({
          key: lp + "PU",
          symbol: "PU",
          label: `Pravděpodobnost úrazu (úder do vedení „${line.name}“) – zóna „${zone.name}“`,
          value: PTU * lineRes.PEB * PLD * CLD,
          formula: E.PU.formula,
          substituted: `PU = ${f(PTU)} · ${f(lineRes.PEB)} · ${f(PLD)} · ${f(CLD)}`,
          equationId: E.PU.id,
          normRef: E.PU.normRef,
          inputs: [{ symbol: "PTU", value: PTU, source: tableSource(T.TABLE_PTU, zone.ptu), label: T.TABLE_PTU.rows[zone.ptu].label }, ...lineInputs],
        });
        const PV = step({
          key: lp + "PV",
          symbol: "PV",
          label: `Pravděpodobnost hmotné škody (úder do vedení „${line.name}“) – zóna „${zone.name}“`,
          value: lineRes.PEB * PLD * CLD,
          formula: E.PV.formula,
          substituted: `PV = ${f(lineRes.PEB)} · ${f(PLD)} · ${f(CLD)}`,
          equationId: E.PV.id,
          normRef: E.PV.normRef,
          inputs: lineInputs,
        });
        const PW = step({
          key: lp + "PW",
          symbol: "PW",
          label: `Pravděpodobnost poruchy systémů (úder do vedení „${line.name}“) – zóna „${zone.name}“`,
          value: PSPD * PLD * CLD,
          formula: E.PW.formula,
          substituted: `PW = ${f(PSPD)} · ${f(PLD)} · ${f(CLD)}`,
          equationId: E.PW.id,
          normRef: E.PW.normRef,
          inputs: [{ symbol: "PSPD", value: PSPD, source: tableSource(T.TABLE_PSPD, sys.pspd) }, lineInputs[1], lineInputs[2]],
        });
        const PZ = step({
          key: lp + "PZ",
          symbol: "PZ",
          label: `Pravděpodobnost poruchy systémů (úder v blízkosti vedení „${line.name}“) – zóna „${zone.name}“`,
          value: PSPD * PLI * CLI,
          formula: E.PZ.formula,
          substituted: `PZ = ${f(PSPD)} · ${f(PLI)} · ${f(CLI)}`,
          equationId: E.PZ.id,
          normRef: E.PZ.normRef,
          inputs: [
            { symbol: "PSPD", value: PSPD, source: tableSource(T.TABLE_PSPD, sys.pspd) },
            { symbol: "PLI", value: PLI, source: tableSource(T.TABLE_PLI, `${line.service}@${uwKey}kV`), label: T.TABLE_PLI.rows[line.service].label },
            { symbol: "CLI", value: CLI, source: tableSource(T.TABLE_CLD_CLI, clRow) },
          ],
        });
        zoneLines.push({ lineId: line.id, systemId: sys.id, PLD, PLI, PU, PV, PW, PZ });
      }
    });

    const PC = systems.length
      ? step({
          key: zp + "PC",
          symbol: "PC",
          label: `Pravděpodobnost poruchy vnitřních systémů (úder do objektu) – zóna „${zone.name}“`,
          value: 1 - systems.reduce((acc, s) => acc * (1 - s.PCi), 1),
          formula: E.PC_MULTI.formula,
          substituted: "PC = 1 − " + systems.map((s) => `(1 − ${f(s.PCi)})`).join(" · "),
          equationId: E.PC_MULTI.id,
          normRef: E.PC_MULTI.normRef,
          inputs: systems.map((s) => ({ symbol: `PC(${s.name})`, value: s.PCi, source: { kind: "computed", equationId: E.PC.id } })),
        })
      : 0;
    const PM = systems.length
      ? step({
          key: zp + "PM",
          symbol: "PM",
          label: `Pravděpodobnost poruchy vnitřních systémů (úder v blízkosti) – zóna „${zone.name}“`,
          value: 1 - systems.reduce((acc, s) => acc * (1 - s.PMi), 1),
          formula: "PM = 1 − Π (1 − PMi)",
          substituted: "PM = 1 − " + systems.map((s) => `(1 − ${f(s.PMi)})`).join(" · "),
          equationId: E.PM.id,
          normRef: E.PM.normRef,
          inputs: systems.map((s) => ({ symbol: `PM(${s.name})`, value: s.PMi, source: { kind: "computed", equationId: E.PM.id } })),
          notes: ["Kombinace více vnitřních systémů obdobně jako u PC – ověřit postup v příloze B."],
        })
      : 0;

    /* --- Ztráty ----------------------------------------------------- */
    const losses: Partial<Record<LossType, ZoneLosses>> = {};
    const rt = rowValue(T.TABLE_RT_FLOOR, zone.floor);
    const rp = rowValue(T.TABLE_RP, zone.fireProvisions);
    const rf = rowValue(T.TABLE_RF, zone.fireRisk);
    const hz = rowValue(T.TABLE_HZ, zone.specialHazard);
    const rInputs = {
      rt: { symbol: "rt", value: rt, source: tableSource(T.TABLE_RT_FLOOR, zone.floor), label: T.TABLE_RT_FLOOR.rows[zone.floor].label } as TraceInput,
      rp: { symbol: "rp", value: rp, source: tableSource(T.TABLE_RP, zone.fireProvisions), label: T.TABLE_RP.rows[zone.fireProvisions].label } as TraceInput,
      rf: { symbol: "rf", value: rf, source: tableSource(T.TABLE_RF, zone.fireRisk), label: T.TABLE_RF.rows[zone.fireRisk].label } as TraceInput,
      hz: { symbol: "hz", value: hz, source: tableSource(T.TABLE_HZ, zone.specialHazard), label: T.TABLE_HZ.rows[zone.specialHazard].label } as TraceInput,
    };

    if (input.lossTypes.L1) {
      const nt = input.structure.totalPersons;
      const nz = zone.persons;
      const tz = zone.hoursPerYear;
      const LT = resolveLoss(zone.l1.lt, T.TABLE_L1_LT, `${zpath}.l1.lt`, messages);
      const LF = resolveLoss(zone.l1.lf, T.TABLE_L1_LF, `${zpath}.l1.lf`, messages);
      const LO = zone.l1.lo ? resolveLoss(zone.l1.lo, T.TABLE_L1_LO, `${zpath}.l1.lo`, messages) : { value: 0, source: { kind: "default", note: "neuvažuje se" } as ValueSource };
      const occ = (nz / nt) * (tz / 8760);
      const occInputs: TraceInput[] = [
        { symbol: "nz", value: nz, source: { kind: "user" } },
        { symbol: "nt", value: nt, source: { kind: "user" } },
        { symbol: "tz", value: tz, unit: "h/rok", source: { kind: "user" } },
      ];
      const LA = step({
        key: zp + "L1.LA",
        symbol: "LA",
        label: `L1 – ztráta úrazem (úder do objektu) – zóna „${zone.name}“`,
        value: rt * LT.value * occ,
        formula: E.L1_LA.formula,
        substituted: `LA = ${f(rt)} · ${f(LT.value)} · ${f(nz)}/${f(nt)} · ${f(tz)}/8 760`,
        equationId: E.L1_LA.id,
        normRef: E.L1_LA.normRef,
        inputs: [rInputs.rt, { symbol: "LT", value: LT.value, source: LT.source }, ...occInputs],
      });
      const LB = step({
        key: zp + "L1.LB",
        symbol: "LB = LV",
        label: `L1 – ztráta fyzickou škodou – zóna „${zone.name}“`,
        value: rp * rf * hz * LF.value * occ,
        formula: E.L1_LB.formula,
        substituted: `LB = ${f(rp)} · ${f(rf)} · ${f(hz)} · ${f(LF.value)} · ${f(nz)}/${f(nt)} · ${f(tz)}/8 760`,
        equationId: E.L1_LB.id,
        normRef: E.L1_LB.normRef,
        inputs: [rInputs.rp, rInputs.rf, rInputs.hz, { symbol: "LF", value: LF.value, source: LF.source }, ...occInputs],
      });
      const LC = step({
        key: zp + "L1.LC",
        symbol: "LC = LM = LW = LZ",
        label: `L1 – ztráta poruchou vnitřních systémů – zóna „${zone.name}“`,
        value: LO.value * occ,
        formula: E.L1_LC.formula,
        substituted: `LC = ${f(LO.value)} · ${f(nz)}/${f(nt)} · ${f(tz)}/8 760`,
        equationId: E.L1_LC.id,
        normRef: E.L1_LC.normRef,
        inputs: [{ symbol: "LO", value: LO.value, source: LO.source }, ...occInputs],
      });
      losses.L1 = { LA, LU: LA, LB, LV: LB, LC, LM: LC, LW: LC, LZ: LC };
      trace.push({
        key: zp + "L1.LU",
        symbol: "LU",
        label: `L1 – ztráta úrazem (úder do vedení) – zóna „${zone.name}“`,
        value: LA,
        formula: E.L1_LU.formula,
        substituted: `LU = LA = ${f(LA)}`,
        equationId: E.L1_LU.id,
        normRef: E.L1_LU.normRef,
        inputs: [],
      });
    }
    if (input.lossTypes.L2 && zone.l2) {
      const nt = input.structure.totalServedUsers as number;
      const nz = zone.l2.servedUsers;
      const LF = resolveLoss(zone.l2.lf, T.TABLE_L2_LF, `${zpath}.l2.lf`, messages);
      const LO = resolveLoss(zone.l2.lo, T.TABLE_L2_LO, `${zpath}.l2.lo`, messages);
      const share = nz / nt;
      const LB = step({
        key: zp + "L2.LB",
        symbol: "LB = LV",
        label: `L2 – ztráta veřejné služby fyzickou škodou – zóna „${zone.name}“`,
        value: rp * rf * LF.value * share,
        formula: E.L2_LB.formula,
        substituted: `LB = ${f(rp)} · ${f(rf)} · ${f(LF.value)} · ${f(nz)}/${f(nt)}`,
        equationId: E.L2_LB.id,
        normRef: E.L2_LB.normRef,
        inputs: [rInputs.rp, rInputs.rf, { symbol: "LF", value: LF.value, source: LF.source }],
      });
      const LC = step({
        key: zp + "L2.LC",
        symbol: "LC = LM = LW = LZ",
        label: `L2 – ztráta veřejné služby poruchou systémů – zóna „${zone.name}“`,
        value: LO.value * share,
        formula: E.L2_LC.formula,
        substituted: `LC = ${f(LO.value)} · ${f(nz)}/${f(nt)}`,
        equationId: E.L2_LC.id,
        normRef: E.L2_LC.normRef,
        inputs: [{ symbol: "LO", value: LO.value, source: LO.source }],
      });
      losses.L2 = { LA: 0, LU: 0, LB, LV: LB, LC, LM: LC, LW: LC, LZ: LC };
    }
    if (input.lossTypes.L3 && zone.l3) {
      const LF = resolveLoss(zone.l3.lf, T.TABLE_L3_LF, `${zpath}.l3.lf`, messages);
      const LB = step({
        key: zp + "L3.LB",
        symbol: "LB = LV",
        label: `L3 – ztráta kulturního dědictví – zóna „${zone.name}“`,
        value: rp * rf * LF.value * zone.l3.valueShare,
        formula: E.L3_LB.formula,
        substituted: `LB = ${f(rp)} · ${f(rf)} · ${f(LF.value)} · ${f(zone.l3.valueShare)}`,
        equationId: E.L3_LB.id,
        normRef: E.L3_LB.normRef,
        inputs: [
          rInputs.rp,
          rInputs.rf,
          { symbol: "LF", value: LF.value, source: LF.source },
          { symbol: "cz/ct", value: zone.l3.valueShare, source: { kind: "user" } },
        ],
      });
      losses.L3 = { LA: 0, LU: 0, LB, LV: LB, LC: 0, LM: 0, LW: 0, LZ: 0 };
    }
    if (input.lossTypes.L4 && zone.l4) {
      const l4 = zone.l4;
      const LF = resolveLoss(l4.lf, T.TABLE_L4_LF, `${zpath}.l4.lf`, messages);
      const LO = resolveLoss(l4.lo, T.TABLE_L4_LO, `${zpath}.l4.lo`, messages);
      let LA = 0;
      if (input.options.l4Animals && l4.lt) {
        const LT = resolveLoss(l4.lt, T.TABLE_L4_LT, `${zpath}.l4.lt`, messages);
        LA = step({
          key: zp + "L4.LA",
          symbol: "LA = LU",
          label: `L4 – ztráta zvířat – zóna „${zone.name}“`,
          value: rt * LT.value * l4.shareAnimals,
          formula: E.L4_LA.formula,
          substituted: `LA = ${f(rt)} · ${f(LT.value)} · ${f(l4.shareAnimals)}`,
          equationId: E.L4_LA.id,
          normRef: E.L4_LA.normRef,
          inputs: [rInputs.rt, { symbol: "LT", value: LT.value, source: LT.source }, { symbol: "ca/ct", value: l4.shareAnimals, source: { kind: "user" } }],
        });
      }
      const LB = step({
        key: zp + "L4.LB",
        symbol: "LB = LV",
        label: `L4 – ekonomická ztráta fyzickou škodou – zóna „${zone.name}“`,
        value: rp * rf * LF.value * l4.shareTotal,
        formula: E.L4_LB.formula,
        substituted: `LB = ${f(rp)} · ${f(rf)} · ${f(LF.value)} · ${f(l4.shareTotal)}`,
        equationId: E.L4_LB.id,
        normRef: E.L4_LB.normRef,
        inputs: [
          rInputs.rp,
          rInputs.rf,
          { symbol: "LF", value: LF.value, source: LF.source },
          { symbol: "(ca+cb+cc+cs)/ct", value: l4.shareTotal, source: { kind: "user" } },
        ],
      });
      const LC = step({
        key: zp + "L4.LC",
        symbol: "LC = LM = LW = LZ",
        label: `L4 – ekonomická ztráta poruchou systémů – zóna „${zone.name}“`,
        value: LO.value * l4.shareSystems,
        formula: E.L4_LC.formula,
        substituted: `LC = ${f(LO.value)} · ${f(l4.shareSystems)}`,
        equationId: E.L4_LC.id,
        normRef: E.L4_LC.normRef,
        inputs: [{ symbol: "LO", value: LO.value, source: LO.source }, { symbol: "cs/ct", value: l4.shareSystems, source: { kind: "user" } }],
      });
      losses.L4 = { LA, LU: LA, LB, LV: LB, LC, LM: LC, LW: LC, LZ: LC };
    }

    /* --- Složky rizika ---------------------------------------------- */
    const components: Partial<Record<LossType, ComponentValues>> = {};
    for (const loss of LOSS_TYPES) {
      const Ls = losses[loss];
      if (!Ls) continue;
      const lossTag = loss.slice(1);
      const lineSum = (pick: (zl: ZoneLineResult) => number, n: (lr: LineResult) => number) =>
        zoneLines.reduce((acc, zl) => acc + n(lineResById.get(zl.lineId)!) * pick(zl), 0);
      const lineSubst = (pick: (zl: ZoneLineResult) => number, n: (lr: LineResult) => string, Lx: number) =>
        zoneLines.length
          ? zoneLines.map((zl) => `${n(lineResById.get(zl.lineId)!)} · ${f(pick(zl))} · ${f(Lx)}`).join(" + ")
          : "0 (žádné vedení v zóně)";
      const nLD = (lr: LineResult) => lr.NL + lr.NDJ;
      const nLDs = (lr: LineResult) => (lr.NDJ ? `(${f(lr.NL)} + ${f(lr.NDJ)})` : f(lr.NL));
      const vals: ComponentValues = {
        RA: ND * PA * Ls.LA,
        RB: ND * PB * Ls.LB,
        RC: ND * PC * Ls.LC,
        RM: NM * PM * Ls.LM,
        RU: lineSum((zl) => zl.PU, nLD) * Ls.LU,
        RV: lineSum((zl) => zl.PV, nLD) * Ls.LV,
        RW: lineSum((zl) => zl.PW, nLD) * Ls.LW,
        RZ: lineSum((zl) => zl.PZ, (lr) => lr.NI) * Ls.LZ,
      };
      const subst: Record<Component, string> = {
        RA: `${f(ND)} · ${f(PA)} · ${f(Ls.LA)}`,
        RB: `${f(ND)} · ${f(PB)} · ${f(Ls.LB)}`,
        RC: `${f(ND)} · ${f(PC)} · ${f(Ls.LC)}`,
        RM: `${f(NM)} · ${f(PM)} · ${f(Ls.LM)}`,
        RU: lineSubst((zl) => zl.PU, nLDs, Ls.LU),
        RV: lineSubst((zl) => zl.PV, nLDs, Ls.LV),
        RW: lineSubst((zl) => zl.PW, nLDs, Ls.LW),
        RZ: lineSubst((zl) => zl.PZ, (lr) => f(lr.NI), Ls.LZ),
      };
      const included = includedComponents(loss, input);
      for (const c of COMPONENTS) {
        const eqDef = E[c];
        trace.push({
          key: `${zp}${loss}.${c}`,
          symbol: `${c}${lossTag}`,
          label: `Složka ${c} pro ${loss} – zóna „${zone.name}“${included.includes(c) ? "" : " (do rizika se nezahrnuje)"}`,
          value: vals[c],
          unit: "1/rok",
          formula: eqDef.formula,
          substituted: `${c} = ${subst[c]}`,
          equationId: eqDef.id,
          normRef: eqDef.normRef,
          inputs: [],
        });
      }
      components[loss] = vals;
    }

    return {
      id: zone.id,
      name: zone.name,
      PTA,
      PB,
      PA,
      PC,
      PM,
      KS1,
      KS2,
      systems,
      lines: zoneLines,
      losses,
      components,
    };
  });

  /* --- Souhrn rizik ------------------------------------------------ */
  const risks: Partial<Record<LossType, RiskSummary>> = {};
  for (const loss of LOSS_TYPES) {
    if (!input.lossTypes[loss]) continue;
    const included = includedComponents(loss, input);
    const comps = Object.fromEntries(COMPONENTS.map((c) => [c, 0])) as ComponentValues;
    const perZone = zones.map((z) => {
      const vals = z.components[loss];
      let total = 0;
      if (vals) {
        for (const c of included) {
          comps[c] += vals[c];
          total += vals[c];
        }
      }
      return { zoneId: z.id, zoneName: z.name, total };
    });
    const total = included.reduce((acc, c) => acc + comps[c], 0);
    const useUser = loss === "L4" && input.tolerableL4 != null;
    const tolerable = useUser ? (input.tolerableL4 as number) : rowValue(T.TABLE_RT, loss);
    const eqDef = E[loss.replace("L", "R") as "R1" | "R2" | "R3" | "R4"];
    trace.push({
      key: `${prefix}${loss}.R`,
      symbol: loss.replace("L", "R"),
      label: `Celkové riziko ${loss.replace("L", "R")} (${T.TABLE_RT.rows[loss].label.toLowerCase()})`,
      value: total,
      unit: "1/rok",
      formula: eqDef.formula,
      substituted: `${loss.replace("L", "R")} = ` + included.map((c) => f(comps[c])).join(" + "),
      equationId: eqDef.id,
      normRef: eqDef.normRef,
      inputs: [],
    });
    const dominant = included
      .map((c) => ({ component: c, value: comps[c], share: total > 0 ? comps[c] / total : 0 }))
      .sort((a, b) => b.value - a.value);
    risks[loss] = {
      loss,
      total,
      tolerable,
      tolerableSource: useUser ? "user" : "table",
      exceeds: total > tolerable,
      included,
      components: comps,
      perZone,
      dominant,
    };
  }

  /* --- Kontroly vstupů -------------------------------------------- */
  if (input.lossTypes.L1) {
    const sumNz = input.zones.reduce((a, z) => a + z.persons, 0);
    if (sumNz > input.structure.totalPersons) {
      messages.push({
        severity: "warning",
        code: "PERSONS_SUM_EXCEEDS_TOTAL",
        message: `Součet osob v zónách (${f(sumNz)}) je větší než celkový počet osob nt (${f(input.structure.totalPersons)}).`,
        path: "structure.totalPersons",
      });
    }
    input.zones.forEach((z, zi) => {
      if (z.persons === 0 || z.hoursPerYear === 0) {
        messages.push({
          severity: "info",
          code: "ZONE_NO_PERSONS",
          message: `Zóna „${z.name}“: nulový počet osob nebo doba přítomnosti – ztráty L1 v zóně jsou nulové.`,
          path: `zones[${zi}].persons`,
        });
      }
    });
  }
  input.zones.forEach((z, zi) =>
    z.internalSystems.forEach((s, si) => {
      if (s.pspd === "better_0005" || s.pspd === "better_0001") {
        messages.push({
          severity: "warning",
          code: "PSPD_BETTER_THAN_LPL_I",
          message: `Systém „${s.name}“: hodnota PSPD lepší než LPL I vyžaduje doložení parametrů SPD.`,
          path: `zones[${zi}].internalSystems[${si}].pspd`,
        });
      }
    }),
  );
  input.lines.forEach((l, i) => {
    if (l.shieldResistance != null && pldRowFor(l) === "unshielded_or_not_bonded") {
      messages.push({
        severity: "info",
        code: "SHIELD_RESISTANCE_IGNORED",
        message: `Vedení „${l.name}“: odpor stínění se neuplatní, protože stínění není spojeno s přípojnicí.`,
        path: `lines[${i}].shieldResistance`,
      });
    }
    const used = input.zones.some((z) => z.internalSystems.some((s) => s.lineId === l.id));
    if (!used) {
      messages.push({
        severity: "warning",
        code: "LINE_NOT_CONNECTED",
        message: `Vedení „${l.name}“ není připojeno k žádnému vnitřnímu systému v zónách – složky RU, RV, RW, RZ se pro něj nepočítají.`,
        path: `lines[${i}]`,
      });
    }
  });

  return {
    scenario,
    NG,
    structure: { ADrect, ADprominent, AD, AM, CD, ND, NM },
    lines,
    zones,
    risks,
    trace,
    messages,
  };
}

/**
 * Referenční stav bez ochranných opatření – pro porovnání „bez ochrany / s ochranou“.
 * Ruší se: LPS (PB), SPD (PEB, PSPD), opatření proti dotykovému a krokovému napětí (PTA, PTU),
 * protipožární opatření (rp) a prostorové stínění (KS1, KS2).
 * Vlastnosti vedení (stínění, uložení), kabeláž (KS3), zóny a ztráty se nemění.
 */
export function stripProtection(input: Ed2Input): Ed2Input {
  return {
    ...input,
    structure: { ...input.structure, lps: "none" },
    lines: input.lines.map((l) => ({ ...l, peb: "none" })),
    zones: input.zones.map((z) => ({
      ...z,
      pta: ["none"],
      ptu: "none",
      fireProvisions: "none",
      shieldExternal: { wm: null, continuous: false },
      shieldInternal: { wm: null, continuous: false },
      internalSystems: z.internalSystems.map((s) => ({ ...s, pspd: "none" })),
    })),
  };
}

export const UNPROTECTED_DESCRIPTION =
  "Referenční stav bez ochranných opatření: bez LPS (PB = 1), bez SPD (PEB = PSPD = 1), bez opatření proti dotykovému a krokovému napětí (PTA = PTU = 1), bez protipožárních opatření (rp = 1) a bez prostorového stínění (KS1 = KS2 = 1). Vlastnosti vedení, vnitřní kabeláž, zóny a ztráty jsou shodné s navrženým stavem.";
