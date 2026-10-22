import { describe, expect, it } from "vitest";
import { czIban, formatIban, isValidIban, parseCzAccount, spayd } from "./bank";

describe("český bankovní účet", () => {
  it("převod na IBAN (vzor ČNB a účet provozovatele)", () => {
    expect(czIban(parseCzAccount("19-2000145399/0800")!)).toBe("CZ6508000000192000145399");
    const iban = czIban(parseCzAccount("242406724/0300")!);
    expect(iban).toBe("CZ8903000000000242406724");
    expect(isValidIban(iban)).toBe(true);
    expect(formatIban(iban)).toBe("CZ89 0300 0000 0002 4240 6724");
  });
  it("odmítne číslo, které neprojde kontrolou modulo 11", () => {
    expect(parseCzAccount("123456789/0300")).toBeNull();
    expect(parseCzAccount("abc/0300")).toBeNull();
  });
  it("QR Platba (SPAYD)", () => {
    expect(spayd({ iban: "CZ8903000000000242406724", amountHaler: 14900, vs: "2612345678", message: "ARONLINE Analýza*1" })).toBe(
      "SPD*1.0*ACC:CZ8903000000000242406724*AM:149.00*CC:CZK*X-VS:2612345678*MSG:ARONLINE ANALYZA 1",
    );
  });
});
