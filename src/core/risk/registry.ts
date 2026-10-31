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
      "Souběžně platí ČSN EN IEC 62305-2 ed. 3; ed. 2 lze používat do 31. 10. 2027. Výpočet podle ed. 3 bude v aplikaci nasazen od 10/2027.",
    ],
  },
  CSN_EN_IEC_62305_2_ED3: {
    id: "CSN_EN_IEC_62305_2_ED3",
    title: "ČSN EN IEC 62305-2 ed. 3:2025",
    norm: "ČSN EN IEC 62305-2 ed. 3 (IEC 62305-2:2024)",
    status: "not_implemented",
    effectiveFrom: "2025-11-01",
    notes: ["Výpočet podle ed. 3 bude v aplikaci nasazen od 10/2027. Do 31. 10. 2027 se analýza zpracovává podle ed. 2."],
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
