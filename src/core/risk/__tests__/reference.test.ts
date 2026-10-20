import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculate } from "../index";
import type { Component } from "../methodologies/csn-en-62305-2-ed2/calculate";
import type { LossType } from "../methodologies/csn-en-62305-2-ed2/tables";

interface ReferenceCase {
  name: string;
  source: string;
  methodologyId: string;
  input: unknown;
  expected: {
    ND?: number;
    NM?: number;
    risks?: Partial<Record<LossType, number>>;
    components?: Partial<Record<LossType, Partial<Record<Component, number>>>>;
  };
  relativeTolerance?: number;
}

const dir = path.join(__dirname, "reference");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const cases: ReferenceCase[] = files.map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));

const close = (actual: number, expected: number, tol: number) =>
  expected === 0 ? Math.abs(actual) < 1e-15 : Math.abs(actual - expected) / Math.abs(expected) <= tol;

describe.skipIf(cases.length === 0)("Referenční příklady z normy (doplní odborník)", () => {
  for (const c of cases) {
    it(`${c.name} (${c.source})`, () => {
      const out = calculate(c.methodologyId, c.input, new Date("2026-10-20"));
      expect(out.ok).toBe(true);
      if (!out.ok || !("result" in out)) return;
      const r = out.result.designed;
      const tol = c.relativeTolerance ?? 0.02;
      if (c.expected.ND != null) expect(close(r.structure.ND, c.expected.ND, tol)).toBe(true);
      if (c.expected.NM != null) expect(close(r.structure.NM, c.expected.NM, tol)).toBe(true);
      for (const [loss, val] of Object.entries(c.expected.risks ?? {})) {
        expect(close(r.risks[loss as LossType]!.total, val as number, tol), `${loss}`).toBe(true);
      }
      for (const [loss, comps] of Object.entries(c.expected.components ?? {})) {
        for (const [comp, val] of Object.entries(comps ?? {})) {
          const actual = r.risks[loss as LossType]!.components[comp as Component];
          expect(close(actual, val as number, tol), `${loss}.${comp}`).toBe(true);
        }
      }
    });
  }
});
