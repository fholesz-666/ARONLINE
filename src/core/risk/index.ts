/**
 * Veřejné API výpočetního jádra analýzy rizika.
 */
import { canonicalJson, sha256Hex } from "../util/sha256";
import { runEd2, type Ed2Outcome } from "./methodologies/csn-en-62305-2-ed2";
import { isMethodologyUsable, METHODOLOGIES } from "./registry";

/** Verze výpočetního jádra (semver). Zvyšuje se při každé změně výpočtu. */
export const CORE_VERSION = "0.1.0";

export type CalculationOutcome =
  | (Ed2Outcome & { methodologyId: "CSN_EN_62305_2_ED2"; coreVersion: string; inputHash?: string })
  | { ok: false; methodologyId: string; coreVersion: string; issues: { path: string; message: string }[] };

export function inputHash(input: unknown): string {
  return sha256Hex(canonicalJson(input));
}

export function calculate(methodologyId: string, input: unknown, now: Date = new Date()): CalculationOutcome {
  const usable = isMethodologyUsable(methodologyId, now);
  if (!usable.usable) {
    return {
      ok: false,
      methodologyId,
      coreVersion: CORE_VERSION,
      issues: [{ path: "methodology", message: usable.reason ?? "Metodiku nelze použít" }],
    };
  }
  switch (methodologyId) {
    case "CSN_EN_62305_2_ED2": {
      const out = runEd2(input);
      return {
        ...out,
        methodologyId: "CSN_EN_62305_2_ED2",
        coreVersion: CORE_VERSION,
        inputHash: out.ok ? inputHash(out.input) : undefined,
      };
    }
    default:
      return {
        ok: false,
        methodologyId,
        coreVersion: CORE_VERSION,
        issues: [{ path: "methodology", message: `Metodika ${METHODOLOGIES[methodologyId]?.title ?? methodologyId} není implementována.` }],
      };
  }
}

export { METHODOLOGIES };
