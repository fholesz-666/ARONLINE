import { TD_GRID } from "@/data/td-cz-grid";

export interface TdLookup {
  /** Třída mapy 1–5 */
  cls: number;
  min: number;
  max: number;
  /** Navržená hodnota = horní mez třídy (na straně bezpečnosti). */
  suggested: number;
  /** Nejvyšší třída v okolí ±1 buňky – blízko hranice tříd. */
  nearBoundary: boolean;
  source: string;
}

const RANGES: Record<number, [number, number]> = { 1: [15, 20], 2: [20, 25], 3: [25, 30], 4: [30, 35], 5: [35, 40] };

function cell(i: number, j: number): number {
  if (j < 0 || j >= TD_GRID.ny || i < 0 || i >= TD_GRID.nx) return 0;
  return Number(TD_GRID.rows[j][i]);
}

/** Počet bouřkových dnů podle polohy (WGS84). Mimo ČR vrací null. */
export function tdAt(lon: number, lat: number): TdLookup | null {
  const i = Math.floor((lon - TD_GRID.lon0) / TD_GRID.dlon);
  const j = Math.floor((TD_GRID.lat1 - lat) / TD_GRID.dlat);
  let c = cell(i, j);
  if (c === 0) {
    // těsně u hranice státu – vezmi nejbližší platnou buňku v okolí
    for (let r = 1; r <= 2 && c === 0; r++)
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) c = Math.max(c, cell(i + di, j + dj));
    if (c === 0) return null;
  }
  let around = c;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) around = Math.max(around, cell(i + di, j + dj));
  const [min, max] = RANGES[c];
  return { cls: c, min, max, suggested: max, nearBoundary: around > c, source: TD_GRID.source };
}
