import { describe, expect, it } from "vitest";
import { calculate, CORE_VERSION, inputHash } from "../index";
import { runEd2 } from "../methodologies/csn-en-62305-2-ed2";
import { calculateScenario, includedComponents, stripProtection } from "../methodologies/csn-en-62305-2-ed2/calculate";
import { getVerificationSummary, listVerificationItems, NORMATIVE_DATA_HASH } from "../methodologies/csn-en-62305-2-ed2/verification";
import { isMethodologyUsable } from "../registry";
import { familyHouse } from "./fixtures";

const rel = (a: number, b: number) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b));

describe("Příloha A – shoda s veřejnou zprávou (Bílovec 2023, nvb.cz)", () => {
  // Veřejná zpráva „Výpočet řízení rizika dle ČSN EN 62305-2 ed. 2“, č. 23022.3:
  // L = 27,3 m; W = 10,31 m; H = 8,3 m; Ng = 2,46; objekt obklopen objekty stejné nebo nižší výšky.
  // Uvedené výsledky: AD = 4 102,26 m², AM = 823 008,16 m², ND = 0,00505, NM = 2,0246.
  // Vedení (1 000 m, v zemi, předměstí): telekom NL = 0,0246, NI = 2,46; silové (s CT = 0,2) NL = 0,00492, NI = 0,492.
  const input = familyHouse();
  input.structure = { ...input.structure, L: 27.3, W: 10.31, H: 8.3, cd: "surrounded_same_or_lower" };
  input.lightning = { mode: "ng", ng: 2.46, td: null, source: "izokeraunická mapa (dle zprávy)" };
  input.lines = [
    { ...input.lines[0], id: "tlc", name: "Telekom", service: "tlc", lineType: "lv_tlc" },
    { ...input.lines[0], id: "nn", name: "Silové", service: "power", lineType: "hv_with_transformer" },
  ];
  input.zones[0].internalSystems = [
    { id: "s1", name: "Telekom", lineId: "tlc", uw: "1.5", ks3: "unshielded_no_precaution", pspd: "none" },
    { id: "s2", name: "Silové", lineId: "nn", uw: "1.5", ks3: "unshielded_no_precaution", pspd: "none" },
  ];
  const r = calculateScenario(input, "designed");

  it("AD a AM", () => {
    expect(r.structure.AD).toBeCloseTo(4102.26, 1);
    expect(r.structure.AM).toBeCloseTo(823008.16, 1);
  });
  it("ND a NM", () => {
    expect(rel(r.structure.ND, 0.00505)).toBeLessThan(0.005);
    expect(rel(r.structure.NM, 2.0246)).toBeLessThan(0.001);
  });
  it("AL, AI, NL, NI pro obě vedení", () => {
    const tlc = r.lines.find((l) => l.id === "tlc")!;
    const nn = r.lines.find((l) => l.id === "nn")!;
    expect(tlc.AL).toBe(40000);
    expect(tlc.AI).toBe(4000000);
    expect(rel(tlc.NL, 0.0246)).toBeLessThan(1e-9);
    expect(rel(tlc.NI, 2.46)).toBeLessThan(1e-9);
    expect(rel(nn.NL, 0.00492)).toBeLessThan(1e-9);
    expect(rel(nn.NI, 0.492)).toBeLessThan(1e-9);
  });
});

describe("Výpočet – rodinný dům (ruční kontrola vzorců)", () => {
  const input = familyHouse();
  const out = runEd2(input);
  if (!out.ok) throw new Error(JSON.stringify(out.issues));
  const d = out.result.designed;

  const AD = 15 * 10 + 2 * 24 * 25 + Math.PI * 24 * 24;
  const ND = 2.5 * AD * 0.5 * 1e-6;
  const AM = 2 * 500 * 25 + Math.PI * 500 * 500;
  const NM = 2.5 * AM * 1e-6;
  const NL = 2.5 * 40000 * 0.5 * 0.5 * 1 * 1e-6;
  const LA = 1e-5 * 0.01 * 1 * 1;
  const LB = 1 * 0.01 * 1 * 0.01 * 1 * 1;

  it("počty nebezpečných událostí", () => {
    expect(d.structure.AD).toBeCloseTo(AD, 6);
    expect(d.structure.ND).toBeCloseTo(ND, 12);
    expect(d.structure.NM).toBeCloseTo(NM, 9);
    expect(d.lines[0].NL).toBeCloseTo(NL, 12);
    expect(d.lines[0].lengthAssumed).toBe(true);
  });

  it("složky R1 a součet", () => {
    const z = d.zones[0].components.L1!;
    expect(z.RA).toBeCloseTo(ND * 1 * LA, 18);
    expect(z.RB).toBeCloseTo(ND * 1 * LB, 15);
    expect(z.RU).toBeCloseTo(NL * 1 * LA, 18);
    expect(z.RV).toBeCloseTo(NL * 1 * LB, 15);
    const R1 = d.risks.L1!;
    expect(R1.included).toEqual(["RA", "RB", "RU", "RV"]);
    expect(R1.total).toBeCloseTo(ND * LA + ND * LB + NL * LA + NL * LB, 15);
    expect(R1.tolerable).toBe(1e-5);
    expect(R1.exceeds).toBe(false);
  });

  it("dominantní složky jsou seřazené a podíly dávají 1", () => {
    const dom = d.risks.L1!.dominant;
    expect(dom[0].component).toBe("RV");
    expect(dom.reduce((a, x) => a + x.share, 0)).toBeCloseTo(1, 12);
  });

  it("stopa obsahuje vzorce, dosazení a odkazy na normu", () => {
    const nd = d.trace.find((t) => t.key === "ND")!;
    expect(nd.formula).toContain("NG · AD · CD");
    expect(nd.substituted).toContain("2,5");
    expect(nd.normRef).toContain("A.4");
    expect(d.trace.length).toBeGreaterThan(20);
  });

  it("výsledek obsahuje upozornění na neověřená normová data", () => {
    expect(out.result.messages.some((m) => m.code === "NORMATIVE_DATA_UNVERIFIED")).toBe(true);
    expect(out.result.verification.fullyVerified).toBe(false);
  });
});

describe("Logika ochranných opatření a složení rizik", () => {
  it("LPS snižuje RB podle PB", () => {
    const a = familyHouse();
    const b = familyHouse();
    b.structure.lps = "lps_iii";
    const ra = calculateScenario(a, "designed").zones[0].components.L1!;
    const rb = calculateScenario(b, "designed").zones[0].components.L1!;
    expect(rb.RB / ra.RB).toBeCloseTo(0.1, 12);
  });

  it("SPD na vstupu vedení snižuje RV podle PEB", () => {
    const a = familyHouse();
    a.lines[0].peb = "lpl_iii_iv";
    const ra = calculateScenario(familyHouse(), "designed").zones[0].components.L1!;
    const rb = calculateScenario(a, "designed").zones[0].components.L1!;
    expect(rb.RV / ra.RV).toBeCloseTo(0.05, 12);
  });

  it("referenční stav bez ochrany ruší opatření a není menší než navržený stav", () => {
    const a = familyHouse();
    a.structure.lps = "lps_iii";
    a.lines[0].peb = "lpl_iii_iv";
    a.zones[0].fireProvisions = "manual";
    a.zones[0].internalSystems[0].pspd = "lpl_iii_iv";
    const stripped = stripProtection(a);
    expect(stripped.structure.lps).toBe("none");
    expect(stripped.lines[0].peb).toBe("none");
    expect(stripped.zones[0].internalSystems[0].pspd).toBe("none");
    const out = runEd2(a);
    if (!out.ok) throw new Error("fail");
    expect(out.result.unprotected.risks.L1!.total).toBeGreaterThan(out.result.designed.risks.L1!.total);
  });

  it("R1 zahrnuje RC, RM, RW, RZ jen při ohrožení života poruchou systémů", () => {
    const base = familyHouse();
    expect(includedComponents("L1", base)).not.toContain("RC");
    base.options.l1InternalSystemsEndangerLife = true;
    base.zones[0].l1.lo = { source: "table", key: "hospital_other" };
    expect(includedComponents("L1", base)).toEqual(["RA", "RB", "RC", "RM", "RU", "RV", "RW", "RZ"]);
    const r = calculateScenario(base, "designed");
    const c = r.zones[0].components.L1!;
    expect(c.RM).toBeGreaterThan(0);
    expect(r.risks.L1!.total).toBeCloseTo(Object.values(c).reduce((a, x) => a + x, 0), 15);
  });

  it("PM: stínění a kabeláž snižují pravděpodobnost", () => {
    const a = familyHouse();
    a.options.l1InternalSystemsEndangerLife = true;
    a.zones[0].l1.lo = { source: "table", key: "hospital_other" };
    const base = calculateScenario(a, "designed").zones[0];
    // KS3 = 1, KS4 = 1/2,5 → PMS = 0,16
    expect(base.systems[0].PMS).toBeCloseTo(0.16, 12);
    a.zones[0].shieldExternal = { wm: 5, continuous: false };
    const shielded = calculateScenario(a, "designed").zones[0];
    expect(shielded.KS1).toBeCloseTo(0.6, 12);
    expect(shielded.systems[0].PMS).toBeCloseTo(0.16 * 0.36, 12);
    a.zones[0].shieldExternal = { wm: null, continuous: true };
    expect(calculateScenario(a, "designed").zones[0].KS1).toBe(1e-4);
  });

  it("stíněné vedení spojené s přípojnicí: PLD podle RS a UW, CLI = 0", () => {
    const a = familyHouse();
    a.lines[0].shielding = "shielded_buried_bonded";
    a.lines[0].shieldResistance = "rs_1_5";
    const z = calculateScenario(a, "designed").zones[0];
    expect(z.lines[0].PLD).toBe(0.6); // UW = 2,5 kV
    expect(z.lines[0].PZ).toBe(0);
  });

  it("NDJ se přičítá k NL u složek z vedení", () => {
    const a = familyHouse();
    a.lines[0].adjacentStructure = { L: 10, W: 10, H: 5, cd: "isolated" };
    const r = calculateScenario(a, "designed");
    const ADJ = 100 + 2 * 15 * 20 + Math.PI * 225;
    expect(r.lines[0].ADJ).toBeCloseTo(ADJ, 9);
    expect(r.lines[0].NDJ).toBeCloseTo(2.5 * ADJ * 1 * 1 * 1e-6, 15);
    const base = calculateScenario(familyHouse(), "designed");
    expect(r.zones[0].components.L1!.RV).toBeGreaterThan(base.zones[0].components.L1!.RV);
  });

  it("Td → NG přepočtem 0,1 · Td s varováním", () => {
    const a = familyHouse();
    a.lightning = { mode: "td", ng: null, td: 25, source: "mapa bouřkových dnů" };
    const r = calculateScenario(a, "designed");
    expect(r.NG).toBeCloseTo(2.5, 12);
    expect(r.messages.some((m) => m.code === "NG_FROM_TD")).toBe(true);
  });

  it("vyčnívající část: AD = max(AD, AD')", () => {
    const a = familyHouse();
    a.structure.prominentHeight = 30;
    const r = calculateScenario(a, "designed");
    expect(r.structure.ADprominent).toBeCloseTo(Math.PI * 90 * 90, 6);
    expect(r.structure.AD).toBe(r.structure.ADprominent);
  });

  it("L2, L3, L4 – složení a přípustná rizika", () => {
    const a = familyHouse();
    a.lossTypes = { L1: true, L2: true, L3: true, L4: true };
    a.structure.totalServedUsers = 100;
    a.zones[0].l2 = { lf: { source: "table", key: "gas_water_power" }, lo: { source: "table", key: "gas_water_power" }, servedUsers: 100 };
    a.zones[0].l3 = { lf: { source: "table", key: "museums_galleries" }, valueShare: 1 };
    a.zones[0].l4 = {
      lt: null,
      lf: { source: "table", key: "other" },
      lo: { source: "table", key: "other" },
      shareAnimals: 0,
      shareTotal: 1,
      shareSystems: 0.2,
    };
    const out = runEd2(a);
    if (!out.ok) throw new Error(JSON.stringify(out.issues));
    const r = out.result.designed.risks;
    expect(r.L2!.included).toEqual(["RB", "RC", "RM", "RV", "RW", "RZ"]);
    expect(r.L3!.included).toEqual(["RB", "RV"]);
    expect(r.L4!.included).toEqual(["RB", "RC", "RM", "RV", "RW", "RZ"]);
    expect(r.L2!.tolerable).toBe(1e-3);
    expect(r.L3!.tolerable).toBe(1e-4);
    expect(r.L4!.tolerable).toBe(1e-3);
  });

  it("vlastní přípustné riziko L4", () => {
    const a = familyHouse();
    a.lossTypes.L4 = true;
    a.tolerableL4 = 1e-4;
    a.zones[0].l4 = {
      lt: null,
      lf: { source: "custom", value: 0.3, note: "stanovil investor" },
      lo: { source: "table", key: "other" },
      shareAnimals: 0,
      shareTotal: 1,
      shareSystems: 0.1,
    };
    const out = runEd2(a);
    if (!out.ok) throw new Error(JSON.stringify(out.issues));
    expect(out.result.designed.risks.L4!.tolerable).toBe(1e-4);
    expect(out.result.designed.risks.L4!.tolerableSource).toBe("user");
    expect(out.result.designed.messages.some((m) => m.code === "CUSTOM_LOSS_VALUE")).toBe(true);
  });
});

describe("Validace vstupů", () => {
  it("chybějící NG", () => {
    const a = familyHouse() as unknown as { lightning: { ng: null } };
    a.lightning.ng = null;
    const out = runEd2(a);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.issues[0].path).toBe("lightning.ng");
  });
  it("odkaz na neexistující vedení", () => {
    const a = familyHouse();
    a.zones[0].internalSystems[0].lineId = "xxx";
    const out = runEd2(a);
    expect(out.ok).toBe(false);
  });
  it("dva systémy na stejném vedení v jedné zóně", () => {
    const a = familyHouse();
    a.zones[0].internalSystems.push({ ...a.zones[0].internalSystems[0], id: "s2" });
    expect(runEd2(a).ok).toBe(false);
  });
  it("chybí RS u stínění spojeného s přípojnicí", () => {
    const a = familyHouse();
    a.lines[0].shielding = "shielded_buried_bonded";
    expect(runEd2(a).ok).toBe(false);
  });
  it("neplatný klíč tabulkové ztráty", () => {
    const a = familyHouse();
    a.zones[0].l1.lf = { source: "table", key: "neexistuje" };
    const out = runEd2(a);
    expect(out.ok).toBe(false);
  });
  it("kombinace „bez opatření“ s opatřením", () => {
    const a = familyHouse();
    a.zones[0].pta = ["none", "warning_notices"];
    expect(runEd2(a).ok).toBe(false);
  });
  it("vlastní hodnota ztráty vyžaduje zdůvodnění", () => {
    const a = familyHouse();
    a.zones[0].l1.lf = { source: "custom", value: 0.1, note: "" };
    expect(runEd2(a).ok).toBe(false);
  });
});

describe("Metodiky, verze a dohledatelnost", () => {
  it("ed. 3 není implementována", () => {
    const out = calculate("CSN_EN_IEC_62305_2_ED3", familyHouse());
    expect(out.ok).toBe(false);
    expect(isMethodologyUsable("CSN_EN_IEC_62305_2_ED3").usable).toBe(false);
  });
  it("ed. 2 nelze použít po 31. 10. 2027", () => {
    expect(isMethodologyUsable("CSN_EN_62305_2_ED2", new Date("2027-10-31T12:00:00Z")).usable).toBe(true);
    expect(isMethodologyUsable("CSN_EN_62305_2_ED2", new Date("2027-11-01T12:00:00Z")).usable).toBe(false);
    const out = calculate("CSN_EN_62305_2_ED2", familyHouse(), new Date("2027-11-02"));
    expect(out.ok).toBe(false);
  });
  it("výpočet je deterministický a nese verzi jádra, otisk dat a otisk vstupu", () => {
    const a = calculate("CSN_EN_62305_2_ED2", familyHouse(), new Date("2026-10-20"));
    const b = calculate("CSN_EN_62305_2_ED2", familyHouse(), new Date("2026-10-20"));
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok && "result" in a && "result" in b) {
      expect(a.coreVersion).toBe(CORE_VERSION);
      expect(a.result.normativeDataHash).toBe(NORMATIVE_DATA_HASH);
      expect(a.inputHash).toBe(b.inputHash);
      expect(JSON.stringify(a.result)).toBe(JSON.stringify(b.result));
    }
    expect(inputHash({ b: 1, a: 2 })).toBe(inputHash({ a: 2, b: 1 }));
  });
  it("každá tabulka a rovnice má odkaz na normu a záznam o ověření", () => {
    const items = listVerificationItems();
    expect(items.length).toBe(getVerificationSummary().total);
    for (const i of items) {
      expect(i.normRef.length).toBeGreaterThan(3);
      expect(i.provenance.length).toBeGreaterThan(10);
      expect(["unverified", "verified", "rejected"]).toContain(i.verification.status);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});
