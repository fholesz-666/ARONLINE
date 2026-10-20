import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { canonicalJson, sha256Hex } from "./sha256";
import { fmtNum, fmtRisk } from "./format";

describe("sha256", () => {
  it("odpovídá referenčním vektorům a Node crypto", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    for (const s of ["Příliš žluťoučký kůň", "x".repeat(55), "y".repeat(56), "z".repeat(1000)]) {
      expect(sha256Hex(s)).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
    }
  });
  it("kanonický JSON řadí klíče", () => {
    expect(canonicalJson({ b: [1, { d: 1, c: 2 }], a: null })).toBe('{"a":null,"b":[1,{"c":2,"d":1}]}');
  });
});

describe("formátování čísel", () => {
  it("běžná čísla s desetinnou čárkou", () => {
    expect(fmtNum(2.46)).toBe("2,46");
    expect(fmtNum(4102.2577, 6)).toBe("4102,26");
    expect(fmtNum(823008.16, 6)).toBe("8,23008·10⁵");
    expect(fmtNum(0)).toBe("0");
    expect(fmtNum(0.5)).toBe("0,5");
  });
  it("malá čísla v exponentovém tvaru", () => {
    expect(fmtNum(1e-5)).toBe("10⁻⁵");
    expect(fmtNum(2.5e-6)).toBe("2,5·10⁻⁶");
    expect(fmtRisk(2.8978e-6)).toBe("2,90·10⁻⁶");
    expect(fmtRisk(9.999e-6)).toBe("1,00·10⁻⁵");
  });
});
