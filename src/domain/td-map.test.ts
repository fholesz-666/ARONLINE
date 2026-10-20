import { describe, expect, it } from "vitest";
import { tdAt } from "./td-map";

describe("mapa bouřkových dnů", () => {
  it("vrací třídu pro místa v ČR", () => {
    const j = tdAt(15.171, 50.724); // Jablonec nad Nisou
    expect(j).not.toBeNull();
    expect(j!.min).toBeGreaterThanOrEqual(15);
    expect(j!.suggested).toBe(j!.max);
    expect(tdAt(13.99, 49.01)!.cls).toBeGreaterThanOrEqual(4); // Šumava – nejvyšší bouřková činnost
  });
  it("mimo ČR vrací null", () => {
    expect(tdAt(10.0, 52.0)).toBeNull();
  });
});
