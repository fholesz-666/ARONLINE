import { describe, expect, it } from "vitest";
import { familyHouse } from "@/core/risk/__tests__/fixtures";
import { protectionLevels } from "./model";

describe("závěr dokumentu – třída LPS a LPL", () => {
  it("LPS třídy III → LPL III, SPD se uvádějí zvlášť", () => {
    const input = familyHouse();
    input.structure.lps = "lps_iii";
    input.lines[0]!.peb = "lpl_iii_iv";
    input.zones[0]!.internalSystems[0]!.pspd = "lpl_ii";
    expect(protectionLevels(input, false)).toEqual([
      ["Třída LPS", "III"],
      ["Hladina ochrany před bleskem LPL", "III"],
      ["SPD pro vyrovnání potenciálů na vstupu vedení", "LPL III–IV"],
      ["Koordinovaný systém SPD", "LPL II"],
    ]);
  });

  it("bez LPS se LPL odvodí z nejpřísnějších SPD", () => {
    const input = familyHouse();
    input.lines[0]!.peb = "lpl_iii_iv";
    input.zones[0]!.internalSystems[0]!.pspd = "lpl_i";
    const rows = Object.fromEntries(protectionLevels(input, false));
    expect(rows["Třída LPS"]).toBe("vnější LPS se nenavrhuje");
    expect(rows["Hladina ochrany před bleskem LPL"]).toBe("I (podle navržených SPD)");
  });

  it("bez jakýchkoli opatření se LPL nestanovuje; nevyhovující stav je označen jako posuzovaný", () => {
    const rows = protectionLevels(familyHouse(), true);
    expect(rows[0]).toEqual(["Třída LPS (posuzovaný stav)", "bez vnějšího LPS"]);
    expect(rows[1]![0]).toBe("Hladina ochrany LPL (posuzovaný stav)");
    expect(rows[1]![1]).toMatch(/^nestanovuje se/);
    expect(rows).toHaveLength(2);
  });
});
