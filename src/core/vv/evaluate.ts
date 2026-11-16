/**
 * Vyhodnocení prostoru: které vlivy nejsou normální, doporučená opatření a minimální krytí IP.
 * Čisté funkce bez I/O.
 */
import { NOT_CONSIDERED, VV_CATALOG, type VvInfluence, type VvLevel } from "./catalog";
import type { VvValues } from "./presets";

export interface EvaluatedRow {
  influence: VvInfluence;
  /** Zvolený kód nebo „N“ (neuvažuje se) */
  value: string;
  level: VvLevel | null;
  notConsidered: boolean;
  normal: boolean;
}

export interface SpaceEvaluation {
  rows: EvaluatedRow[];
  /** Všechny posuzované vlivy jsou normální */
  normal: boolean;
  /** Vlivy, které nejsou normální (v pořadí katalogu) */
  abnormal: EvaluatedRow[];
  /** Doporučené minimální krytí, např. „IP44“ nebo „IP2XC“ */
  minIp: string;
  /** Chybějící nebo neplatné hodnoty (id vlivů) */
  missing: string[];
}

const AE_DIGIT: Record<string, number> = { AE1: 0, AE2: 3, AE3: 4, AE4: 5, AE5: 6, AE6: 6 };
const AD_DIGIT: Record<string, number> = { AD1: 0, AD2: 2, AD3: 3, AD4: 4, AD5: 5, AD6: 6, AD7: 7, AD8: 8 };

/** Minimální krytí podle AD (voda), AE (cizí tělesa) a BA2 (děti → IP2XC). */
export function minimalIp(values: VvValues): string {
  let first = AE_DIGIT[values.AE] ?? 0;
  const second = AD_DIGIT[values.AD] ?? 0;
  const children = values.BA === "BA2";
  if (children && first < 2) first = 2;
  if (first === 0 && second === 0) return "IP20";
  return `IP${first || "X"}${second || "X"}${children && first <= 2 ? "C" : ""}`;
}

export function evaluateSpace(values: VvValues): SpaceEvaluation {
  const rows: EvaluatedRow[] = [];
  const missing: string[] = [];
  for (const inf of VV_CATALOG) {
    const value = values[inf.id];
    if (value === NOT_CONSIDERED && inf.allowNotConsidered) {
      rows.push({ influence: inf, value, level: null, notConsidered: true, normal: true });
      continue;
    }
    const level = inf.levels.find((l) => l.code === value) ?? null;
    if (!level) {
      missing.push(inf.id);
      rows.push({ influence: inf, value: value ?? "", level: null, notConsidered: false, normal: true });
      continue;
    }
    rows.push({ influence: inf, value, level, notConsidered: false, normal: level.normal });
  }
  const abnormal = rows.filter((r) => !r.notConsidered && r.level && !r.normal);
  return { rows, normal: abnormal.length === 0, abnormal, minIp: minimalIp(values), missing };
}

/** Normální úrovně daného vlivu (sloupec „vlivy považované za normální“). */
export function normalCodes(inf: VvInfluence): string {
  const codes = inf.levels.filter((l) => l.normal).map((l) => l.code);
  return codes.length ? codes.join(", ") : "–";
}
