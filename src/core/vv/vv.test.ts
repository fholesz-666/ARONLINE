import { describe, expect, it } from "vitest";
import { NOT_CONSIDERED, VV_CATALOG } from "./catalog";
import { evaluateSpace, minimalIp, normalCodes } from "./evaluate";
import { BASE_INDOOR, presetValues, VV_PRESETS } from "./presets";
import { zProtocolData } from "./schema";

describe("katalog vnějších vlivů", () => {
  it("má unikátní identifikátory a kódy", () => {
    const ids = VV_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const codes = VV_CATALOG.flatMap((i) => i.levels.map((l) => l.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("každý nenormální vliv má doporučené opatření", () => {
    for (const inf of VV_CATALOG) for (const l of inf.levels) if (!l.normal) expect(l.measure, l.code).toBeTruthy();
  });

  it("normální vlivy odpovídají tabulce ZA.1 a národním poznámkám", () => {
    const byId = Object.fromEntries(VV_CATALOG.map((i) => [i.id, normalCodes(i)]));
    expect(byId.AA).toBe("AA4, AA5");
    expect(byId.AB).toBe("AB4, AB5");
    expect(byId.AD).toBe("AD1");
    expect(byId.AE).toBe("AE1");
    expect(byId.AQ).toBe("AQ1, AQ2");
    expect(byId.BA).toBe("BA1");
    expect(byId.BC).toBe("BC1, BC2");
    expect(byId.BD).toBe("BD1");
  });
});

describe("předvolby prostor", () => {
  it("výchozí vnitřní prostor je normální", () => {
    const e = evaluateSpace(BASE_INDOOR);
    expect(e.missing).toEqual([]);
    expect(e.normal).toBe(true);
    expect(e.minIp).toBe("IP20");
  });

  it("všechny předvolby mají platné hodnoty pro všechny vlivy", () => {
    for (const p of VV_PRESETS) expect(evaluateSpace(presetValues(p.id)).missing, p.id).toEqual([]);
  });

  it("střecha s FVE je abnormální kvůli AQ3 a venkovnímu klimatu", () => {
    const e = evaluateSpace(presetValues("pv-roof"));
    expect(e.normal).toBe(false);
    const codes = e.abnormal.map((r) => r.value);
    expect(codes).toContain("AQ3");
    expect(codes).toContain("AD4");
    expect(codes).toContain("AM-23-2");
    expect(e.minIp).toBe("IP54");
  });
});

describe("minimální krytí", () => {
  it("skládá IP z AE a AD", () => {
    expect(minimalIp({ AE: "AE1", AD: "AD4" })).toBe("IPX4");
    expect(minimalIp({ AE: "AE4", AD: "AD1" })).toBe("IP5X");
    expect(minimalIp({ AE: "AE2", AD: "AD3" })).toBe("IP33");
  });
  it("u dětí požaduje IP2XC", () => {
    expect(minimalIp({ AE: "AE1", AD: "AD1", BA: "BA2" })).toBe("IP2XC");
    expect(minimalIp({ AE: "AE3", AD: "AD1", BA: "BA2" })).toBe("IP4X");
  });
});

describe("schéma protokolu", () => {
  const valid = {
    object: { name: "Rodinný dům", address: "Dačického 1, Praha", date: "2026-11-16" },
    committee: { chair: { name: "Jan Novák", role: "projektant" }, members: [{ name: "Petr Malý", role: "revizní technik" }] },
    spaces: [{ id: "s1", name: "Obývací pokoj", values: presetValues("normal") }],
  };

  it("přijme úplný protokol", () => {
    expect(zProtocolData.safeParse(valid).success).toBe(true);
  });

  it("odmítne neplatný kód vlivu", () => {
    const bad = { ...valid, spaces: [{ id: "s1", name: "X", values: { ...presetValues("normal"), AD: "AD9" } }] };
    expect(zProtocolData.safeParse(bad).success).toBe(false);
  });

  it("neuvažuje se jen tam, kde je to dovoleno", () => {
    const bad = { ...valid, spaces: [{ id: "s1", name: "X", values: { ...presetValues("normal"), AA: NOT_CONSIDERED } }] };
    expect(zProtocolData.safeParse(bad).success).toBe(false);
  });

  it("vyžaduje alespoň jednoho člena komise kromě předsedy", () => {
    const bad = { ...valid, committee: { chair: valid.committee.chair, members: [] } };
    expect(zProtocolData.safeParse(bad).success).toBe(false);
  });
});
