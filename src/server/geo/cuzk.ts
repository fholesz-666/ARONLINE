/**
 * Klient veřejných služeb ČÚZK (ArcGIS REST). Data: CC BY 4.0, © ČÚZK.
 *
 * Ověřeno 20. 10. 2026 (dotazy z prohlížeče):
 * - RUIAN MapServer: vrstvy 1 AdresniMisto, 3 StavebniObjekt (polygony), 5 Parcela, 7 KatastralniUzemi
 * - GeocodeSOE: suggest (adresy i parcely), find (magicKey), tables/1/reverseGeocode
 * - Výškopis: 3D/dmr5g (terén), 3D/dmp (povrch) – operace identify (getSamples je zakázán)
 */
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { geoCache } from "../db/schema";
import { errorMeta, log } from "../log";

export const CUZK = {
  ruian: "https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer",
  geocode: "https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/exts/GeocodeSOE",
  dmr: "https://ags.cuzk.gov.cz/arcgis/rest/services/3D/dmr5g/ImageServer",
  dmp: "https://ags.cuzk.gov.cz/arcgis/rest/services/3D/dmp/ImageServer",
  layers: { address: 1, building: 3, parcel: 5, cadastralArea: 7 },
} as const;

export class GeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoError";
  }
}

type FetchLike = typeof fetch;
let fetchImpl: FetchLike = (...a) => fetch(...a);
let cacheEnabled = true;

/** Pro testy: podstrčení fetch a vypnutí DB cache. */
export function setGeoFetchForTests(f: FetchLike | null, useCache = false) {
  fetchImpl = f ?? ((...a) => fetch(...a));
  cacheEnabled = useCache;
}

const CACHE_TTL_MS = 30 * 24 * 3600 * 1000;

export async function getJson<T>(url: string, ttlMs = CACHE_TTL_MS): Promise<T> {
  const key = "cuzk:" + createHash("sha256").update(url).digest("hex");
  if (cacheEnabled) {
    try {
      const hit = await getDb().query.geoCache.findFirst({ where: eq(geoCache.key, key) });
      if (hit && hit.expiresAt > new Date()) return hit.data as T;
    } catch (e) {
      log.warn("geo_cache_read_failed", errorMeta(e));
    }
  }
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "ARONLINE/0.1 (analyza rizika LPS)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new GeoError(`Služba ČÚZK odpověděla chybou HTTP ${res.status}`);
      const data = (await res.json()) as T & { error?: { message?: string } };
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new GeoError(`Služba ČÚZK vrátila chybu: ${data.error.message ?? "neznámá"}`);
      }
      if (cacheEnabled) {
        try {
          await getDb()
            .insert(geoCache)
            .values({ key, data: data as object, expiresAt: new Date(Date.now() + ttlMs) })
            .onConflictDoUpdate({ target: geoCache.key, set: { data: data as object, expiresAt: new Date(Date.now() + ttlMs) } });
        } catch (e) {
          log.warn("geo_cache_write_failed", errorMeta(e));
        }
      }
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  log.warn("cuzk_request_failed", { host: new URL(url).host, ...errorMeta(lastErr) });
  throw lastErr instanceof GeoError ? lastErr : new GeoError("Služba ČÚZK není dostupná. Zkuste to později nebo zadejte údaje ručně.");
}

const qs = (o: Record<string, string>) => new URLSearchParams(o).toString();

/* ---------------- Vyhledávání ---------------- */

export interface Suggestion {
  text: string;
  magicKey: string;
  type: "address" | "parcel" | "other";
}

export async function suggest(text: string): Promise<Suggestion[]> {
  const data = await getJson<{ suggestions?: { text: string; magicKey: string; type?: string }[] }>(
    `${CUZK.geocode}/suggest?${qs({ text, maxSuggestions: "8", f: "json" })}`,
    24 * 3600 * 1000,
  );
  return (data.suggestions ?? []).map((s) => ({
    text: s.text,
    magicKey: s.magicKey,
    type: s.type === "AdresniMisto" ? "address" : s.type?.startsWith("Parcela") ? "parcel" : "other",
  }));
}

export async function findLocation(text: string, magicKey: string): Promise<{ lon: number; lat: number; label: string } | null> {
  const data = await getJson<{
    locations?: { name: string; feature: { geometry: { x: number; y: number } } }[];
  }>(`${CUZK.geocode}/find?${qs({ text, magicKey, outSR: "4326", f: "json" })}`);
  const loc = data.locations?.[0];
  if (!loc) return null;
  return { lon: loc.feature.geometry.x, lat: loc.feature.geometry.y, label: loc.name };
}

export async function reverseGeocode(lon: number, lat: number): Promise<{ address: string; lon: number; lat: number } | null> {
  const data = await getJson<{ address?: { Address?: string }; location?: { x: number; y: number } }>(
    `${CUZK.geocode}/tables/${CUZK.layers.address}/reverseGeocode?${qs({
      location: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }),
      distance: "60",
      outSR: "4326",
      f: "json",
    })}`,
  ).catch(() => null);
  if (!data?.address?.Address || !data.location) return null;
  return { address: data.address.Address, lon: data.location.x, lat: data.location.y };
}

/* ---------------- RÚIAN dotazy ---------------- */

export interface RuianBuilding {
  objectId: number;
  code: number | null;
  rings: [number, number][][];
  attributes: Record<string, unknown>;
}

export async function buildingsInEnvelope(lon: number, lat: number, radiusM: number): Promise<RuianBuilding[]> {
  const dLat = radiusM / 110_574;
  const dLon = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const env = { xmin: lon - dLon, ymin: lat - dLat, xmax: lon + dLon, ymax: lat + dLat, spatialReference: { wkid: 4326 } };
  const data = await getJson<{
    features?: { attributes: Record<string, unknown>; geometry?: { rings?: [number, number][][] } }[];
  }>(
    `${CUZK.ruian}/${CUZK.layers.building}/query?${qs({
      geometry: JSON.stringify(env),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields:
        "objectid,kod,cisladomovni,typstavebnihoobjektukod,zpusobvyuzitikod,pocetpodlazi,zastavenaplocha,druhkonstrukcekod,zdroj",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
    })}`,
  );
  return (data.features ?? [])
    .filter((f) => f.geometry?.rings?.length)
    .slice(0, 400)
    .map((f) => ({
      objectId: Number(f.attributes.objectid),
      code: f.attributes.kod != null ? Number(f.attributes.kod) : null,
      rings: f.geometry!.rings!,
      attributes: f.attributes,
    }));
}

export async function parcelAt(lon: number, lat: number): Promise<{ label: string; cadastralArea: string | null; areaM2: number | null } | null> {
  const data = await getJson<{ features?: { attributes: Record<string, unknown> }[] }>(
    `${CUZK.ruian}/${CUZK.layers.parcel}/query?${qs({
      geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }),
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "cisloparcely,katastralniuzemi,vymeraparcely,druhcislovanikod",
      returnGeometry: "false",
      f: "json",
    })}`,
  );
  const a = data.features?.[0]?.attributes;
  if (!a) return null;
  let kuName: string | null = null;
  if (a.katastralniuzemi != null) {
    const ku = await getJson<{ features?: { attributes: { nazev?: string } }[] }>(
      `${CUZK.ruian}/${CUZK.layers.cadastralArea}/query?${qs({
        where: `kod=${Number(a.katastralniuzemi)}`,
        outFields: "kod,nazev",
        returnGeometry: "false",
        f: "json",
      })}`,
    ).catch(() => null);
    const name = ku?.features?.[0]?.attributes.nazev;
    kuName = name ? `${name} (${Number(a.katastralniuzemi)})` : String(a.katastralniuzemi);
  }
  // druh číslování 2 = pozemková parcela, 1 = stavební parcela („st.“)
  const prefix = Number(a.druhcislovanikod) === 1 ? "st. " : "";
  return {
    label: `p. č. ${prefix}${String(a.cisloparcely ?? "")}`.trim(),
    cadastralArea: kuName,
    areaM2: a.vymeraparcely != null ? Number(a.vymeraparcely) : null,
  };
}

/* ---------------- Výškopis ---------------- */

export async function elevationAt(service: "dmr" | "dmp", lon: number, lat: number): Promise<number | null> {
  const url = `${service === "dmr" ? CUZK.dmr : CUZK.dmp}/identify?${qs({
    geometry: JSON.stringify({ x: Number(lon.toFixed(7)), y: Number(lat.toFixed(7)), spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryPoint",
    returnGeometry: "false",
    returnCatalogItems: "false",
    f: "json",
  })}`;
  try {
    const data = await getJson<{ value?: string }>(url);
    const v = data.value != null ? Number(data.value) : NaN;
    return Number.isFinite(v) && v > -100 && v < 2000 ? v : null;
  } catch {
    return null;
  }
}

/** Číselník způsobu využití stavebního objektu RÚIAN (z domény služby, ověřeno 20. 10. 2026). */
export const RUIAN_USE: Record<number, string> = {
  1: "průmyslový objekt",
  2: "zemědělská usedlost",
  3: "objekt k bydlení",
  4: "objekt lesního hospodářství",
  5: "objekt občanské vybavenosti",
  6: "bytový dům",
  7: "rodinný dům",
  8: "stavba pro rodinnou rekreaci",
  9: "stavba pro shromažďování většího počtu osob",
  10: "stavba pro obchod",
  11: "stavba ubytovacího zařízení",
  12: "stavba pro výrobu a skladování",
  13: "zemědělská stavba",
  14: "stavba pro administrativu",
  15: "stavba občanského vybavení",
  16: "stavba technického vybavení",
  17: "stavba pro dopravu",
  18: "garáž",
  19: "jiná stavba",
  20: "víceúčelová stavba",
  21: "skleník",
};

/** Návrh typu objektu podle způsobu využití v RÚIAN – jen návrh k potvrzení. */
export const RUIAN_USE_TO_TYPE: Record<number, string> = {
  1: "industrial",
  3: "family_house",
  6: "apartment_building",
  7: "family_house",
  8: "family_house",
  9: "assembly",
  10: "retail",
  11: "hotel",
  12: "industrial",
  14: "office",
};
