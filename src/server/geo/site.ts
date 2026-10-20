/**
 * Automatické zjištění objektu a okolí z dat ČÚZK.
 * Každá hodnota nese zdroj a kvalitu; nic se nedomýšlí – chybějící údaj zůstane null.
 */
import {
  exteriorSamples,
  interiorSamples,
  localFrame,
  median,
  minAreaRect,
  pointInPolygon,
  pointPolygonDistance,
  polygonArea,
  polygonDistance,
  type LonLat,
  type XY,
} from "@/domain/geometry";
import { buildingsInEnvelope, elevationAt, parcelAt, reverseGeocode, RUIAN_USE, RUIAN_USE_TO_TYPE, type RuianBuilding } from "./cuzk";

export interface SiteBuilding {
  id: string;
  footprint: LonLat[];
  area: number;
  length: number;
  width: number;
  orientationDeg: number;
  floors: number | null;
  use: string | null;
  suggestedType: string | null;
  geometrySource: string | null;
  heightEstimate: number | null;
  terrainElevation: number | null;
  surfaceElevation: number | null;
  source: string;
}

export interface SiteNeighbour {
  id: string;
  footprint: LonLat[];
  distance: number;
  area: number;
  floors: number | null;
  heightEstimate: number | null;
}

export interface SiteLookup {
  location: { lon: number; lat: number };
  address: string | null;
  parcel: { label: string; cadastralArea: string | null; areaM2: number | null } | null;
  building: SiteBuilding | null;
  candidates: { id: string; distance: number; area: number }[];
  neighbours: SiteNeighbour[];
  notes: string[];
  retrievedAt: string;
}

const SRC_RUIAN = "RÚIAN (ČÚZK), vrstva Stavební objekt";
const SRC_HEIGHT = "Odhad: DMP 1G − DMR 5G (ČÚZK), rozdíl povrchu a terénu";

async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

function outerRing(b: RuianBuilding): LonLat[] {
  // největší prstenec = vnější obrys
  return [...b.rings].sort((a, c) => c.length - a.length)[0] as LonLat[];
}

/** Odhad výšky: max. povrch uvnitř obrysu − medián terénu kolem objektu. */
async function estimateHeight(ringXY: XY[], frame: ReturnType<typeof localFrame>, detailed: boolean) {
  const inside = interiorSamples(ringXY, detailed ? 5 : 1).map((p) => frame.toLonLat(p));
  const outside = exteriorSamples(ringXY, 3, detailed ? 4 : 2).map((p) => frame.toLonLat(p));
  const surf = (await pool(inside, 4, ([lon, lat]) => elevationAt("dmp", lon, lat))).filter((v): v is number => v != null);
  const terr = (await pool(outside, 4, ([lon, lat]) => elevationAt("dmr", lon, lat))).filter((v): v is number => v != null);
  const terrain = median(terr);
  const surface = surf.length ? Math.max(...surf) : null;
  const h = terrain != null && surface != null ? surface - terrain : null;
  return {
    terrain,
    surface,
    height: h != null && h >= 1.5 && h < 300 ? Math.round(h * 10) / 10 : null,
  };
}

export async function lookupSite(lon: number, lat: number, opts: { neighbourRadiusM?: number; pickBuildingId?: string } = {}): Promise<SiteLookup> {
  const notes: string[] = [];
  const frame = localFrame(lon, lat);
  const radius = opts.neighbourRadiusM ?? 120;
  const here: XY = [0, 0];

  const [buildings, parcel, address] = await Promise.all([
    buildingsInEnvelope(lon, lat, radius + 30).catch((e) => {
      notes.push(`Budovy z RÚIAN se nepodařilo načíst: ${e instanceof Error ? e.message : "chyba"}`);
      return [] as RuianBuilding[];
    }),
    parcelAt(lon, lat).catch(() => {
      notes.push("Parcelu se nepodařilo zjistit – doplňte ručně.");
      return null;
    }),
    reverseGeocode(lon, lat).catch(() => null),
  ]);

  const shapes = buildings.map((b) => {
    const ring = outerRing(b);
    const xy = ring.map((p) => frame.toXY(p));
    return { b, ring, xy, dist: pointPolygonDistance(here, xy), area: polygonArea(xy) };
  });

  // Hlavní budova: zvolená uživatelem, nebo budova obsahující bod, nebo nejbližší do 15 m
  let main =
    (opts.pickBuildingId ? shapes.find((s) => String(s.b.objectId) === opts.pickBuildingId) : undefined) ??
    shapes.find((s) => pointInPolygon(here, s.xy)) ??
    [...shapes].filter((s) => s.dist <= 15).sort((a, c) => a.dist - c.dist)[0];

  const candidates = shapes
    .filter((s) => s.dist <= 40)
    .sort((a, c) => a.dist - c.dist)
    .slice(0, 10)
    .map((s) => ({ id: String(s.b.objectId), distance: Math.round(s.dist * 10) / 10, area: Math.round(s.area) }));

  let building: SiteBuilding | null = null;
  let neighbours: SiteNeighbour[] = [];
  if (!main) {
    notes.push("V místě nebyla v RÚIAN nalezena budova s obrysem. Zadejte rozměry ručně nebo vyberte budovu v mapě.");
  } else {
    const rect = minAreaRect(main.xy);
    const est = await estimateHeight(main.xy, frame, true);
    const useCode = Number(main.b.attributes.zpusobvyuzitikod);
    const floors = main.b.attributes.pocetpodlazi != null ? Number(main.b.attributes.pocetpodlazi) : null;
    const zdroj = Number(main.b.attributes.zdroj);
    building = {
      id: String(main.b.objectId),
      footprint: main.ring,
      area: Math.round(main.area * 10) / 10,
      length: Math.round(rect.length * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      orientationDeg: Math.round(rect.orientationDeg),
      floors,
      use: RUIAN_USE[useCode] ?? null,
      suggestedType: RUIAN_USE_TO_TYPE[useCode] ?? null,
      geometrySource: zdroj === 1 ? "DKM" : zdroj === 2 ? "UKM" : null,
      heightEstimate: est.height,
      terrainElevation: est.terrain != null ? Math.round(est.terrain * 10) / 10 : null,
      surfaceElevation: est.surface,
      source: SRC_RUIAN,
    };
    if (est.height == null) notes.push("Výšku objektu se nepodařilo odhadnout z výškopisu – zadejte ji ručně.");
    else
      notes.push(
        "Výška je jen orientační odhad z digitálního modelu povrchu (DMP 1G může být starší než stavba, zachycuje i stromy a nástavby). Ověřte ji podle výkresů.",
      );
    if (main.b.rings.length > 1) notes.push("Obrys budovy obsahuje více částí (např. dvůr) – rozměry jsou z vnějšího obrysu.");

    const near = shapes
      .filter((s) => s !== main)
      .map((s) => ({ s, d: polygonDistance(main!.xy, s.xy) }))
      .filter((x) => x.d <= radius)
      .sort((a, c) => a.d - c.d)
      .slice(0, 40);
    // výšku odhadujeme jen pro nejbližších 10 budov (omezení počtu dotazů)
    const heights = await pool(near.slice(0, 10), 3, (x) => estimateHeight(x.s.xy, frame, false));
    neighbours = near.map((x, i) => ({
      id: String(x.s.b.objectId),
      footprint: x.s.ring,
      distance: Math.round(x.d * 10) / 10,
      area: Math.round(x.s.area),
      floors: x.s.b.attributes.pocetpodlazi != null ? Number(x.s.b.attributes.pocetpodlazi) : null,
      heightEstimate: heights[i]?.height ?? null,
    }));
  }

  return {
    location: { lon, lat },
    address: address?.address ?? null,
    parcel,
    building,
    candidates,
    neighbours,
    notes,
    retrievedAt: new Date().toISOString(),
  };
}

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
