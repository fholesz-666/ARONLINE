/**
 * Rozsah výsledku, který se posílá do prohlížeče.
 * Před odemčením (a při PREVIEW_DETAIL=summary) jen souhrn: rizika, verdikt, dominantní složky.
 * Plná stopa výpočtu je v odemčené dokumentaci a v náhledu po odemčení.
 */
import type { Ed2CalculationResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2";
import type { Ed2ScenarioResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2/calculate";
import { getConfig } from "../config";

export type ScenarioSummary = Pick<Ed2ScenarioResult, "scenario" | "NG" | "messages"> & {
  structure: Pick<Ed2ScenarioResult["structure"], "AD" | "AM" | "ND" | "NM">;
  risks: Partial<
    Record<
      string,
      {
        loss: string;
        total: number;
        tolerable: number;
        tolerableSource: string;
        exceeds: boolean;
        dominant: { component: string; share: number }[];
      }
    >
  >;
};

export interface ResultView {
  level: "summary" | "full";
  methodologyId: string;
  normativeDataHash: string;
  verification: Ed2CalculationResult["verification"];
  messages: Ed2CalculationResult["messages"];
  designed: ScenarioSummary | Ed2ScenarioResult;
  unprotected: ScenarioSummary | Ed2ScenarioResult;
}

function summarize(s: Ed2ScenarioResult): ScenarioSummary {
  return {
    scenario: s.scenario,
    NG: s.NG,
    messages: s.messages,
    structure: { AD: s.structure.AD, AM: s.structure.AM, ND: s.structure.ND, NM: s.structure.NM },
    risks: Object.fromEntries(
      Object.entries(s.risks).map(([k, r]) => [
        k,
        {
          loss: r!.loss,
          total: r!.total,
          tolerable: r!.tolerable,
          tolerableSource: r!.tolerableSource,
          exceeds: r!.exceeds,
          dominant: r!.dominant.map((d) => ({ component: d.component, share: d.share })),
        },
      ]),
    ),
  };
}

export function resultView(result: Ed2CalculationResult, unlocked: boolean): ResultView {
  const full = unlocked || getConfig().PREVIEW_DETAIL === "full";
  return {
    level: full ? "full" : "summary",
    methodologyId: result.methodologyId,
    normativeDataHash: result.normativeDataHash,
    verification: result.verification,
    messages: result.messages,
    designed: full ? result.designed : summarize(result.designed),
    unprotected: full ? result.unprotected : summarize(result.unprotected),
  };
}
