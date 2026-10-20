/**
 * Geometrie pro malé oblasti (budova a okolí do několika set metrů).
 * Souřadnice WGS84 se převádějí do lokální rovinné soustavy (ekvidistantní přiblížení).
 * Chyba vzdáleností a ploch je v řádu desetin procenta – dostačující pro předvyplnění,
 * hodnoty musí projektant potvrdit.
 */
export type LonLat = [number, number];
export type XY = [number, number];

const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LON_EQ = 111_320;

export interface LocalFrame {
  lon0: number;
  lat0: number;
  toXY(p: LonLat): XY;
  toLonLat(p: XY): LonLat;
}

export function localFrame(lon0: number, lat0: number): LocalFrame {
  const kx = M_PER_DEG_LON_EQ * Math.cos((lat0 * Math.PI) / 180);
  return {
    lon0,
    lat0,
    toXY: ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * M_PER_DEG_LAT],
    toLonLat: ([x, y]) => [lon0 + x / kx, lat0 + y / M_PER_DEG_LAT],
  };
}

/** Odstraní uzavírací bod (poslední = první). */
export function openRing<T extends number[]>(ring: T[]): T[] {
  if (ring.length > 1) {
    const a = ring[0];
    const b = ring[ring.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1);
  }
  return ring;
}

export function polygonArea(pts: XY[]): number {
  const p = openRing(pts);
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function centroid(pts: XY[]): XY {
  const p = openRing(pts);
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = p.length || 1;
    return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

export function convexHull(points: XY[]): XY[] {
  const pts = [...openRing(points)].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  if (pts.length <= 2) return pts;
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XY[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: XY[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export interface Rect {
  /** Delší strana (m) */
  length: number;
  /** Kratší strana (m) */
  width: number;
  /** Azimut delší strany ve stupních (0 = sever, po směru hodin) */
  orientationDeg: number;
  area: number;
}

/** Obdélník minimální plochy opsaný polygonu (rotující posuvná měřítka nad konvexním obalem). */
export function minAreaRect(points: XY[]): Rect {
  const hull = convexHull(points);
  if (hull.length < 3) return { length: 0, width: 0, orientationDeg: 0, area: 0 };
  let best: { area: number; w: number; h: number; angle: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [x, y] of hull) {
      const rx = x * c - y * s;
      const ry = x * s + y * c;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const area = w * h;
    if (!best || area < best.area - 1e-9) best = { area, w, h, angle };
  }
  const b = best!;
  const longAlongEdge = b.w >= b.h;
  const length = Math.max(b.w, b.h);
  const width = Math.min(b.w, b.h);
  // směr delší strany v rovině (rad, od osy x proti směru hodin)
  const dir = longAlongEdge ? b.angle : b.angle + Math.PI / 2;
  let az = 90 - (dir * 180) / Math.PI; // azimut od severu
  az = ((az % 180) + 180) % 180;
  return { length, width, orientationDeg: az, area: b.area };
}

function segDist(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx;
  const y = a[1] + t * dy;
  return Math.hypot(p[0] - x, p[1] - y);
}

export function pointInPolygon(p: XY, poly: XY[]): boolean {
  const ring = openRing(poly);
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Nejmenší vzdálenost dvou polygonů (0, pokud se protínají nebo jeden leží v druhém). */
export function polygonDistance(a: XY[], b: XY[]): number {
  const A = openRing(a);
  const B = openRing(b);
  if (A.some((p) => pointInPolygon(p, B)) || B.some((p) => pointInPolygon(p, A))) return 0;
  let d = Infinity;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      d = Math.min(d, segDist(A[i], B[j], B[(j + 1) % B.length]), segDist(B[j], A[i], A[(i + 1) % A.length]));
    }
  }
  return d;
}

export function pointPolygonDistance(p: XY, poly: XY[]): number {
  if (pointInPolygon(p, poly)) return 0;
  const ring = openRing(poly);
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) d = Math.min(d, segDist(p, ring[i], ring[(i + 1) % ring.length]));
  return d;
}

/** Body uvnitř polygonu pro vzorkování výšky povrchu (střed + body mezi středem a vrcholy). */
export function interiorSamples(poly: XY[], max = 6): XY[] {
  const ring = openRing(poly);
  const c = centroid(ring);
  const out: XY[] = pointInPolygon(c, ring) ? [c] : [];
  const step = Math.max(1, Math.floor(ring.length / (max - 1)));
  for (let i = 0; i < ring.length && out.length < max; i += step) {
    const p: XY = [c[0] + (ring[i][0] - c[0]) * 0.6, c[1] + (ring[i][1] - c[1]) * 0.6];
    if (pointInPolygon(p, ring)) out.push(p);
  }
  return out.length ? out : [c];
}

/** Body vně polygonu (o `offset` m za vrcholy) pro vzorkování terénu. */
export function exteriorSamples(poly: XY[], offset = 3, max = 4): XY[] {
  const ring = openRing(poly);
  const c = centroid(ring);
  const step = Math.max(1, Math.floor(ring.length / max));
  const out: XY[] = [];
  for (let i = 0; i < ring.length && out.length < max; i += step) {
    const [x, y] = ring[i];
    const dx = x - c[0];
    const dy = y - c[1];
    const len = Math.hypot(dx, dy) || 1;
    out.push([x + (dx / len) * offset, y + (dy / len) * offset]);
  }
  return out;
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
