import { describe, expect, it } from "vitest";
import { calculate } from "../index";
import { PROZIK_TICHA, TICHA } from "./prozik-ticha";

/** Prozik zaokrouhluje NG na 2 desetinná místa (2,12 místo 2,1248) → tolerance 1 %. */
const TOL = 0.01;

describe("shoda s OEZ Prozik 2.60 – SO102 MŠ Tichá", () => {
  const out = calculate("CSN_EN_62305_2_ED2", TICHA, new Date("2026-10-20"));
  it("výpočet proběhne", () => expect(out.ok).toBe(true));
  if (!out.ok || !("result" in out)) return;
  const r = out.result.designed;
  it("NG podle ČSN 33 2000-4-443 (Td 24 → 2,12)", () => {
    expect(r.trace.find((t) => t.key === "NG")!.value).toBeCloseTo(2.12, 2);
  });
  it("R1 – všechny složky", () => {
    for (const [k, v] of Object.entries(PROZIK_TICHA.L1)) {
      const a = k === "total" ? r.risks.L1!.total : (r.risks.L1!.components as Record<string, number>)[k];
      if (v === 0) expect(a, k).toBe(0);
      else expect(Math.abs(a * 1e5 - v) / v, k).toBeLessThanOrEqual(k === "RU" ? 0.02 : TOL);
    }
  });
  it("R4 – složky nezávislé na druhém systému na vedení NN (RA, RB, RM, RU, RV)", () => {
    for (const k of ["RA", "RB", "RM", "RU", "RV"] as const) {
      const v = PROZIK_TICHA.L4[k];
      const a = (r.risks.L4!.components as Record<string, number>)[k] * 1e5;
      expect(Math.abs(a - v) / v, k).toBeLessThanOrEqual(k === "RU" ? 0.02 : TOL);
    }
  });
});
