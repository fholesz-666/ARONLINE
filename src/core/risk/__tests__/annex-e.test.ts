import { describe, expect, it } from "vitest";
import { calculateScenario } from "../methodologies/csn-en-62305-2-ed2/calculate";
import { zEd2Input, type Ed2Input } from "../methodologies/csn-en-62305-2-ed2/schema";

/**
 * Vzorové příklady z přílohy E ČSN EN 62305-2 ed. 2 – hodnoty opsané z textu normy
 * (tabulky E.20, E.21, E.33–E.37, E.45). Výsledky v normě jsou zaokrouhlené na 3–4 platné číslice.
 */

const e5 = (r: number) => r * 1e5;
const shieldNone = { shieldExternal: { wm: null, continuous: false }, shieldInternal: { wm: null, continuous: false } };
const tbl = (key: string) => ({ source: "table" as const, key });

function parse(input: unknown): Ed2Input {
  return zEd2Input.parse(input);
}

/* ------------------------------------------------------------------ E.2 */
describe("E.2 Venkovský dům", () => {
  const input = parse({
    structure: { L: 15, W: 20, H: 6, prominentHeight: null, cd: "isolated", lps: "none", totalPersons: 5, totalServedUsers: null },
    lightning: { mode: "ng", ng: 4, td: null, source: "E.2" },
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    tolerableL4: null,
    lines: [
      { id: "p", name: "silové", service: "power", installation: "buried", lineType: "lv_tlc", environment: "rural", lengthM: 1000, shielding: "buried_unshielded", shieldResistance: null, peb: "none", adjacentStructure: null },
      { id: "t", name: "TLC", service: "tlc", installation: "aerial", lineType: "lv_tlc", environment: "rural", lengthM: 1000, shielding: "aerial_unshielded", shieldResistance: null, peb: "none", adjacentStructure: null },
    ],
    zones: [
      {
        id: "z2", name: "Z2", location: "inside", persons: 5, hoursPerYear: 8760, floor: "asphalt_linoleum_wood", pta: ["none"], ptu: "none",
        fireRisk: "fire_low", fireProvisions: "none", specialHazard: "none",
        l1: { lt: tbl("all"), lf: tbl("hospital_hotel_school_civic"), lo: null }, l2: null, l3: null, l4: null, ...shieldNone,
        internalSystems: [
          { id: "s1", name: "silové", lineId: "p", uw: "2.5", ks3: "unshielded_avoid_large_loops", pspd: "none" },
          { id: "s2", name: "TLC", lineId: "t", uw: "1.5", ks3: "unshielded_no_precaution", pspd: "none" },
        ],
      },
    ],
  });

  it("ND a R1 nechráněné stavby (R1 = 2,51·10⁻⁵)", () => {
    const r = calculateScenario(input, "designed");
    expect(r.structure.ND).toBeCloseTo(1.03e-2, 4);
    const R = r.risks.L1!;
    expect(e5(R.components.RB)).toBeCloseTo(0.103, 3);
    expect(e5(R.components.RV)).toBeCloseTo(2.4, 2);
    expect(e5(R.total)).toBeCloseTo(2.51, 2);
  });
});

/* ------------------------------------------------------------------ E.3 */
function office(lps: string, peb: string, rpArchive: string): Ed2Input {
  const l1 = { lt: tbl("all"), lf: tbl("industrial_commercial"), lo: null };
  const sys = [
    { id: "s1", name: "silové", lineId: "p", uw: "2.5", ks3: "unshielded_avoid_large_loops", pspd: "none" },
    { id: "s2", name: "TLC", lineId: "t", uw: "1.5", ks3: "unshielded_no_precaution", pspd: "none" },
  ];
  const zone = (id: string, location: string, persons: number, floor: string, pta: string, fireRisk: string, rp: string, hz: string, withSys: boolean) => ({
    id, name: id.toUpperCase(), location, persons, hoursPerYear: 8760, floor, pta: [pta], ptu: "none", fireRisk, fireProvisions: rp, specialHazard: hz,
    l1, l2: null, l3: null, l4: null, ...shieldNone, internalSystems: withSys ? sys : [],
  });
  return parse({
    structure: { L: 20, W: 40, H: 25, prominentHeight: null, cd: "isolated", lps, totalPersons: 200, totalServedUsers: null },
    lightning: { mode: "ng", ng: 4, td: null, source: "E.3" },
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    tolerableL4: null,
    lines: [
      { id: "p", name: "silové", service: "power", installation: "aerial", lineType: "lv_tlc", environment: "rural", lengthM: 200, shielding: "aerial_unshielded", shieldResistance: null, peb, adjacentStructure: null },
      { id: "t", name: "TLC", service: "tlc", installation: "buried", lineType: "lv_tlc", environment: "rural", lengthM: 1000, shielding: "buried_unshielded", shieldResistance: null, peb, adjacentStructure: null },
    ],
    zones: [
      zone("z1", "outside", 4, "marble_ceramic", "none", "none", "none", "none", false),
      zone("z2", "outside", 2, "agricultural_concrete", "physical_restrictions", "none", "none", "none", false),
      zone("z3", "inside", 20, "asphalt_linoleum_wood", "none", "fire_high", rpArchive, "panic_low", true),
      zone("z4", "inside", 160, "asphalt_linoleum_wood", "none", "fire_low", "none", "panic_low", true),
      zone("z5", "inside", 14, "asphalt_linoleum_wood", "none", "fire_low", "none", "panic_low", true),
    ],
  });
}

describe("E.3 Kancelářská budova", () => {
  it("nechráněná stavba – tab. E.20 (R1 = 9,65·10⁻⁵)", () => {
    const r = calculateScenario(office("none", "none", "none"), "designed");
    expect(r.structure.ND).toBeCloseTo(0.11, 3);
    const R = r.risks.L1!;
    const z = Object.fromEntries(R.perZone.map((p) => [p.zoneId, e5(p.total)]));
    expect(z.z1).toBeCloseTo(0.002, 3);
    expect(z.z3).toBeCloseTo(8.876, 2);
    expect(z.z4).toBeCloseTo(0.712, 3);
    expect(z.z5).toBeCloseTo(0.062, 3);
    expect(e5(R.components.RB)).toBeCloseTo(4.778, 2);
    expect(e5(R.components.RV)).toBeCloseTo(4.87, 2);
    expect(e5(R.total)).toBeCloseTo(9.65, 2);
  });

  it("řešení a) LPS III + PEB – tab. E.21 (R1 = 0,722·10⁻⁵)", () => {
    expect(e5(calculateScenario(office("lps_iii", "lpl_iii_iv", "none"), "designed").risks.L1!.total)).toBeCloseTo(0.722, 3);
  });

  it("řešení b) LPS IV + PEB + ruční hašení v archivu – tab. E.21 (R1 = 0,648·10⁻⁵)", () => {
    expect(e5(calculateScenario(office("lps_iv", "lpl_iii_iv", "manual"), "designed").risks.L1!.total)).toBeCloseTo(0.648, 3);
  });
});

/* ------------------------------------------------------------------ E.4 */
type HospitalOpts = { lps?: string; peb?: string; pspd?: string; rpWard?: string; wmIcu?: number | null };
function hospital(o: HospitalOpts = {}): Ed2Input {
  const peb = o.peb ?? "none";
  const pspd = o.pspd ?? "none";
  const sys = [
    { id: "s1", name: "silové", lineId: "p", uw: "2.5", ks3: "unshielded_avoid_large_loops", pspd },
    { id: "s2", name: "TLC", lineId: "t", uw: "1.5", ks3: "unshielded_avoid_loops", pspd },
  ];
  const l1 = (lo: string | null) => ({ lt: tbl("all"), lf: tbl("hospital_hotel_school_civic"), lo: lo ? tbl(lo) : null });
  const l4 = (shareTotal: number, shareSystems: number) => ({
    lt: null, lf: tbl("hospital_industrial_museum_agriculture"), lo: tbl("hospital_industrial_office_hotel_commercial"), shareAnimals: 0, shareTotal, shareSystems,
  });
  const inside = (id: string, persons: number, fireRisk: string, rp: string, wm: number | null, lo: string, ct: number, cs: number) => ({
    id, name: id.toUpperCase(), location: "inside", persons, hoursPerYear: 8760, floor: "asphalt_linoleum_wood", pta: ["none"], ptu: "none",
    fireRisk, fireProvisions: rp, specialHazard: "evacuation_difficult", l1: l1(lo), l2: null, l3: null, l4: l4(ct / 90, cs / 90),
    shieldExternal: { wm: null, continuous: false }, shieldInternal: { wm, continuous: false }, internalSystems: sys,
  });
  return parse({
    structure: { L: 50, W: 150, H: 10, prominentHeight: null, cd: "isolated", lps: o.lps ?? "none", totalPersons: 1000, totalServedUsers: null },
    lightning: { mode: "ng", ng: 4, td: null, source: "E.4" },
    lossTypes: { L1: true, L2: false, L3: false, L4: true },
    options: { l1InternalSystemsEndangerLife: true, l4Animals: false },
    tolerableL4: null,
    lines: [
      { id: "p", name: "silové vn", service: "power", installation: "buried", lineType: "hv_with_transformer", environment: "suburban", lengthM: 500, shielding: "shielded_buried_bonded", shieldResistance: "rs_le_1", peb, adjacentStructure: null },
      { id: "t", name: "TLC", service: "tlc", installation: "buried", lineType: "lv_tlc", environment: "suburban", lengthM: 300, shielding: "shielded_buried_bonded", shieldResistance: "rs_1_5", peb, adjacentStructure: { L: 20, W: 30, H: 5, cd: "isolated" } },
    ],
    zones: [
      {
        id: "z1", name: "Z1", location: "outside", persons: 10, hoursPerYear: 8760, floor: "agricultural_concrete", pta: ["none"], ptu: "none",
        fireRisk: "none", fireProvisions: "none", specialHazard: "none", l1: l1(null), l2: null, l3: null, l4: l4(0, 0), ...shieldNone, internalSystems: [],
      },
      inside("z2", 950, "fire_ordinary", o.rpWard ?? "none", null, "hospital_other", 79.5, 3.5),
      inside("z3", 35, "fire_low", "none", o.wmIcu ?? null, "icu_operating", 8.4, 5.5),
      inside("z4", 5, "fire_low", "none", o.wmIcu ?? null, "icu_operating", 2.1, 1.0),
    ],
  });
}

describe("E.4 Nemocnice", () => {
  it("nechráněná stavba – sběrné plochy a četnosti (tab. E.30, E.31)", () => {
    const r = calculateScenario(hospital(), "designed");
    expect(r.structure.AD).toBeCloseTo(2.23e4, -2);
    expect(r.structure.NM!).toBeCloseTo(3.94, 2);
    expect(r.lines[1].NDJ!).toBeCloseTo(1.12e-2, 4);
  });

  it("nechráněná stavba – R1 po zónách a složkách (tab. E.33, R1 = 69,96·10⁻⁵)", () => {
    const R = calculateScenario(hospital(), "designed").risks.L1!;
    const z = Object.fromEntries(R.perZone.map((p) => [p.zoneId, e5(p.total)]));
    expect(z.z1).toBeCloseTo(0.009, 3);
    expect(z.z2).toBeCloseTo(64.37, 1);
    expect(z.z3).toBeCloseTo(4.89, 1); // norma: součet zaokrouhlených složek 4,883 uvádí jako 4,89
    expect(z.z4).toBeCloseTo(0.698, 3);
    expect(e5(R.components.RB)).toBeCloseTo(42.6, 1);
    expect(e5(R.components.RC)).toBeCloseTo(12.057, 2);
    expect(e5(R.components.RM)).toBeCloseTo(3.429, 2);
    expect(e5(R.components.RW)).toBeCloseTo(2.616, 2);
    expect(e5(R.total)).toBeCloseTo(69.96, 1);
  });

  it("řešení a) a b) – tab. E.34 a E.35", () => {
    const a = calculateScenario(hospital({ lps: "lps_i", peb: "lpl_i", pspd: "better_0005", rpWard: "automatic", wmIcu: 0.5 }), "designed");
    const b = calculateScenario(hospital({ lps: "lps_i", peb: "lpl_i", pspd: "better_0001", rpWard: "automatic" }), "designed");
    expect(e5(a.risks.L1!.total)).toBeCloseTo(0.338, 3);
    expect(e5(b.risks.L1!.total)).toBeCloseTo(0.222, 3);
    // R4 a roční náklady na ztráty CRL = R4 · ct (tab. E.37)
    expect(e5(a.risks.L4!.total)).toBeCloseTo(0.3, 2);
    expect(e5(b.risks.L4!.total)).toBeCloseTo(0.21, 2);
    expect(a.risks.L4!.total * 90e6).toBeCloseTo(271, -1);
    expect(b.risks.L4!.total * 90e6).toBeCloseTo(190, -1);
  });

  it("řešení c) s PSPD = 0,002 a stíněním wm = 0,1 m – tab. E.36 (R1 = 0,244·10⁻⁵)", () => {
    const c = calculateScenario(hospital({ lps: "lps_i", peb: "lpl_i", pspd: "better_0002", rpWard: "automatic", wmIcu: 0.1 }), "designed");
    // Tab. E.36 uvádí v zóně Z2 RM ≈ 0, což neodpovídá řešení a) a b) téže normy: Z2 nemá prostorové stínění,
    // RM je úměrné PSPD (a: 0,005 → 0,012; b: 0,001 → 0,002), takže pro 0,002 vychází 0,0048·10⁻⁵.
    // Ostatní složky souhlasí; R1 bez RM v Z2 = 0,244·10⁻⁵ jako v normě.
    const rmZ2 = e5(c.zones.find((z) => z.id === "z2")!.components.L1!.RM);
    expect(rmZ2).toBeCloseTo(0.0048, 4);
    expect(e5(c.risks.L1!.total) - rmZ2).toBeCloseTo(0.244, 2);
    expect(Math.abs(e5(c.risks.L1!.total) - rmZ2 - 0.244)).toBeLessThan(0.002);
    expect(e5(c.risks.L4!.total)).toBeCloseTo(0.23, 2);
  });

  it("nechráněná stavba – R4 (tab. E.37, R4 = 63,5·10⁻⁵)", () => {
    const R = calculateScenario(hospital(), "designed").risks.L4!;
    const z = Object.fromEntries(R.perZone.map((p) => [p.zoneId, e5(p.total)]));
    expect(z.z2).toBeCloseTo(53.2, 1);
    expect(z.z3).toBeCloseTo(8.7, 1);
    expect(z.z4).toBeCloseTo(1.6, 1);
    expect(e5(R.total)).toBeCloseTo(63.5, 1);
  });
});

/* ------------------------------------------------------------------ E.5 */
function apartments(H: number, fireRisk: string, lps: string, rp: string, peb: string): Ed2Input {
  return parse({
    structure: { L: 30, W: 20, H, prominentHeight: null, cd: "isolated", lps, totalPersons: 200, totalServedUsers: null },
    lightning: { mode: "ng", ng: 4, td: null, source: "E.5" },
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    tolerableL4: null,
    lines: [
      { id: "p", name: "silové", service: "power", installation: "buried", lineType: "lv_tlc", environment: "suburban", lengthM: 200, shielding: "buried_unshielded", shieldResistance: null, peb, adjacentStructure: null },
      { id: "t", name: "TLC", service: "tlc", installation: "buried", lineType: "lv_tlc", environment: "suburban", lengthM: 100, shielding: "buried_unshielded", shieldResistance: null, peb, adjacentStructure: null },
    ],
    zones: [
      {
        id: "z2", name: "Z2", location: "inside", persons: 200, hoursPerYear: 8760, floor: "asphalt_linoleum_wood", pta: ["none"], ptu: "none",
        fireRisk, fireProvisions: rp, specialHazard: "none",
        l1: { lt: tbl("all"), lf: tbl("hospital_hotel_school_civic"), lo: null }, l2: null, l3: null, l4: null, ...shieldNone,
        internalSystems: [
          { id: "s1", name: "silové", lineId: "p", uw: "2.5", ks3: "unshielded_avoid_large_loops", pspd: "none" },
          { id: "s2", name: "TLC", lineId: "t", uw: "1.5", ks3: "unshielded_no_precaution", pspd: "none" },
        ],
      },
    ],
  });
}

describe("E.5 Bytový dům – všechny řádky tab. E.45", () => {
  const PEB: Record<string, string> = { none: "none", lps_iv: "lpl_iii_iv", lps_iii: "lpl_iii_iv", lps_ii: "lpl_ii", lps_i: "lpl_i" };
  const rows: [number, string, string, string, number][] = [
    [20, "fire_low", "none", "none", 0.837],
    [20, "fire_ordinary", "none", "none", 8.364],
    [20, "fire_ordinary", "lps_iii", "none", 0.776],
    [20, "fire_ordinary", "lps_iv", "manual", 0.747],
    [20, "fire_high", "none", "none", 83.64],
    [20, "fire_high", "lps_ii", "automatic", 0.764],
    [20, "fire_high", "lps_i", "none", 1.553],
    [20, "fire_high", "lps_i", "manual", 0.776],
    [40, "fire_low", "none", "none", 2.436],
    [40, "fire_low", "none", "automatic", 0.489],
    [40, "fire_low", "lps_iv", "none", 0.469],
    [40, "fire_ordinary", "none", "none", 24.34],
    [40, "fire_ordinary", "lps_iv", "automatic", 0.938],
    [40, "fire_ordinary", "lps_i", "none", 0.475],
    [40, "fire_high", "none", "none", 243.4],
    [40, "fire_high", "lps_i", "automatic", 0.949],
  ];
  it.each(rows)("H = %i m, %s, LPS %s, rp %s → R1 = %f·10⁻⁵", (H, rf, lps, rp, expected) => {
    const R = calculateScenario(apartments(H, rf, lps, rp, PEB[lps]), "designed").risks.L1!;
    expect(Math.abs(e5(R.total) - expected) / expected).toBeLessThan(0.002);
  });
});

describe("Kontroly zadání odvozené z příkladů", () => {
  it("LPS bez SPD na vstupu vedení → varování LPS_WITHOUT_PEB s doporučenou hodnotou", () => {
    const without = calculateScenario(apartments(20, "fire_ordinary", "lps_iii", "none", "none"), "designed");
    const msg = without.messages.filter((m) => m.code === "LPS_WITHOUT_PEB");
    expect(msg).toHaveLength(2);
    expect(msg[0].message).toContain("PEB = 0,05");
    const withPeb = calculateScenario(apartments(20, "fire_ordinary", "lps_iii", "none", "lpl_iii_iv"), "designed");
    expect(withPeb.messages.some((m) => m.code === "LPS_WITHOUT_PEB")).toBe(false);
    expect(e5(without.risks.L1!.total)).toBeGreaterThan(2 * e5(withPeb.risks.L1!.total));
  });

  it("L1 s ohrožením života poruchou systémů nevyžaduje LO ve venkovní zóně", () => {
    expect(() => hospital()).not.toThrow();
  });
});
