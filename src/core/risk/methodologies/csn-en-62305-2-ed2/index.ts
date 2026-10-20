import type { ZodIssue } from "zod";
import type { CalcMessage } from "../../types";
import { CalcInputError, calculateScenario, stripProtection, type Ed2ScenarioResult } from "./calculate";
import { zEd2Input, type Ed2Input } from "./schema";
import { getVerificationSummary, NORMATIVE_DATA_HASH, type VerificationSummary } from "./verification";

export const ED2_ID = "CSN_EN_62305_2_ED2" as const;

export interface Ed2CalculationResult {
  methodologyId: typeof ED2_ID;
  normativeDataHash: string;
  verification: VerificationSummary;
  designed: Ed2ScenarioResult;
  unprotected: Ed2ScenarioResult;
  /** Zprávy vztahující se k celému výpočtu (ověření, platnost metodiky). */
  messages: CalcMessage[];
}

export type Ed2Outcome =
  | { ok: true; input: Ed2Input; result: Ed2CalculationResult }
  | { ok: false; issues: { path: string; message: string }[] };

export function formatZodIssues(issues: ZodIssue[]): { path: string; message: string }[] {
  return issues.map((i) => ({
    path: i.path.map((p) => (typeof p === "number" ? `[${p}]` : p)).join(".").replace(/\.\[/g, "["),
    message: i.message,
  }));
}

export function runEd2(rawInput: unknown): Ed2Outcome {
  const parsed = zEd2Input.safeParse(rawInput);
  if (!parsed.success) return { ok: false, issues: formatZodIssues(parsed.error.issues) };
  const input = parsed.data;
  try {
    const designed = calculateScenario(input, "designed");
    const unprotected = calculateScenario(stripProtection(input), "unprotected");
    const verification = getVerificationSummary();
    const messages: CalcMessage[] = [];
    if (!verification.fullyVerified) {
      messages.push({
        severity: "warning",
        code: "NORMATIVE_DATA_UNVERIFIED",
        message: `Výpočet používá normové hodnoty a vzorce, které dosud nebyly odborně ověřeny proti textu ČSN EN 62305-2 ed. 2 (neověřeno ${verification.unverified + verification.rejected} z ${verification.total} položek). Výsledek nelze považovat za normově ověřený.`,
      });
    }
    return {
      ok: true,
      input,
      result: {
        methodologyId: ED2_ID,
        normativeDataHash: NORMATIVE_DATA_HASH,
        verification,
        designed,
        unprotected,
        messages,
      },
    };
  } catch (e) {
    if (e instanceof CalcInputError) return { ok: false, issues: [{ path: e.path ?? "", message: e.message }] };
    throw e;
  }
}

export { zEd2Input };
export type { Ed2Input, Ed2ScenarioResult };
