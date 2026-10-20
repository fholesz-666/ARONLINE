/**
 * Registr metodik. Každé vydání normy je samostatný modul s vlastním vstupem,
 * výpočtem a dokumentací. Metodiky se nesmí míchat.
 */
export type MethodologyStatus = "implemented" | "not_implemented";

export interface MethodologyInfo {
  id: string;
  title: string;
  norm: string;
  status: MethodologyStatus;
  /** Datum účinnosti normy (ISO). */
  effectiveFrom?: string;
  /** Poslední den, kdy lze metodiku použít pro nové výpočty (ISO), pokud je znám. */
  usableUntil?: string;
  notes: string[];
}

export const METHODOLOGIES: Record<string, MethodologyInfo> = {
  CSN_EN_62305_2_ED2: {
    id: "CSN_EN_62305_2_ED2",
    title: "ČSN EN 62305-2 ed. 2:2013",
    norm: "ČSN EN 62305-2 ed. 2 (únor 2013), IEC 62305-2:2010 – Ochrana před bleskem – Část 2: Řízení rizika",
    status: "implemented",
    effectiveFrom: "2013-03-01",
    usableUntil: "2027-10-31",
    notes: [
      "Nahrazena ČSN EN IEC 62305-2 ed. 3 (účinnost 1. 11. 2025). Podle dostupných informací ji lze souběžně používat do 31. 10. 2027 (dow EN IEC 62305-2:2024) – přesné přechodné ustanovení ČSN je nutné ověřit.",
      "Tabulkové hodnoty a vzorce v jádře zatím nejsou odborně ověřeny proti textu normy.",
    ],
  },
  CSN_EN_IEC_62305_2_ED3: {
    id: "CSN_EN_IEC_62305_2_ED3",
    title: "ČSN EN IEC 62305-2 ed. 3:2025",
    norm: "ČSN EN IEC 62305-2 ed. 3 (říjen 2025), IEC 62305-2:2024 – Ochrana před bleskem – Část 2: Management rizika",
    status: "not_implemented",
    effectiveFrom: "2025-11-01",
    notes: [
      "Neimplementováno: vzorce, tabulky a přípustné hodnoty RT a FT nejsou veřejně dostupné. Implementace vyžaduje legálně pořízený text normy a odborné ověření.",
      "Hlavní změny: společné riziko R (L1 + L2), četnost poškození F vnitřních systémů, hustota úderů NSG místo NG, opatření s TWS, riziko osob ve volném prostoru.",
    ],
  },
};

export const DEFAULT_METHODOLOGY = "CSN_EN_62305_2_ED2";

export function isMethodologyUsable(id: string, now: Date = new Date()): { usable: boolean; reason?: string } {
  const m = METHODOLOGIES[id];
  if (!m) return { usable: false, reason: "Neznámá metodika" };
  if (m.status !== "implemented") return { usable: false, reason: `Metodika ${m.title} není implementována.` };
  if (m.usableUntil && now.toISOString().slice(0, 10) > m.usableUntil) {
    return {
      usable: false,
      reason: `Metodiku ${m.title} nelze po ${m.usableUntil} použít pro nové výpočty.`,
    };
  }
  return { usable: true };
}
