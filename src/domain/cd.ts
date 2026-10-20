/** Návrh součinitele polohy CD z okolních budov – sdílí klient i server. */
export interface CdSuggestion {
  key: "surrounded_higher" | "surrounded_same_or_lower" | "isolated";
  reason: string;
}

/**
 * Návrh součinitele polohy CD z okolních budov ve vzdálenosti do 3H.
 * Jde jen o NÁVRH – volbu (včetně „na vrcholu kopce“) potvrzuje projektant.
 */
export function suggestCd(H: number, neighbours: { distance: number; height: number | null; include: boolean }[]): CdSuggestion {
  const within = neighbours.filter((n) => n.include && n.distance <= 3 * H);
  if (!within.length) return { key: "isolated", reason: `V okruhu 3H = ${(3 * H).toFixed(1)} m nejsou zahrnuté žádné objekty.` };
  const known = within.filter((n) => n.height != null);
  if (known.some((n) => (n.height as number) > H)) {
    return {
      key: "surrounded_higher",
      reason: `V okruhu 3H je ${within.length} objektů, alespoň jeden je vyšší než posuzovaný objekt.`,
    };
  }
  const unknown = within.length - known.length;
  return {
    key: "surrounded_same_or_lower",
    reason: `V okruhu 3H je ${within.length} objektů stejné nebo nižší výšky${unknown ? ` (u ${unknown} chybí výška – ověřte)` : ""}.`,
  };
}
