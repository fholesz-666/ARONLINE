import { describe, expect, it } from "vitest";
import { localFrame, minAreaRect, polygonArea, polygonDistance, type LonLat } from "@/domain/geometry";
import { setGeoFetchForTests } from "@/server/geo/cuzk";
import { lookupSite, suggestCd } from "@/server/geo/site";

// Skutečný obrys budovy č. p. 483, Jablonec nad Nisou (RÚIAN, staženo 20. 10. 2026).
// RÚIAN uvádí zastavěnou plochu 223 m².
const BUILDING_483: LonLat[] = [
  [15.1705151, 50.7243961],
  [15.1705278, 50.724459],
  [15.1705442, 50.7245456],
  [15.1705469, 50.7245581],
  [15.1705759, 50.724556],
  [15.1707187, 50.7245418],
  [15.170687, 50.7243794],
  [15.1705151, 50.7243961],
];
const BUILDING_490: LonLat[] = [
  [15.1720018, 50.7244039],
  [15.1719836, 50.7243059],
  [15.1720415, 50.7243014],
  [15.1720318, 50.7242508],
  [15.1720649, 50.7242482],
  [15.1720452, 50.7241456],
  [15.1717501, 50.7241666],
  [15.1717986, 50.7244197],
  [15.1720018, 50.7244039],
];

describe("geometrie budov", () => {
  const f = localFrame(15.1706, 50.7245);
  const xy = BUILDING_483.map((p) => f.toXY(p));

  it("plocha odpovídá zastavěné ploše v RÚIAN (±3 %)", () => {
    expect(Math.abs(polygonArea(xy) - 223) / 223).toBeLessThan(0.03);
  });

  it("rozměry opsaného obdélníku", () => {
    const r = minAreaRect(xy);
    expect(r.length).toBeGreaterThan(17.5);
    expect(r.length).toBeLessThan(18.7);
    expect(r.width).toBeGreaterThan(11.8);
    expect(r.width).toBeLessThan(12.7);
  });

  it("vzdálenost dvou budov", () => {
    const d = polygonDistance(xy, BUILDING_490.map((p) => f.toXY(p)));
    // budovy jsou od sebe cca 70 m
    expect(d).toBeGreaterThan(60);
    expect(d).toBeLessThan(80);
    expect(polygonDistance(xy, xy)).toBe(0);
  });

  it("čtverec 10 × 10 m", () => {
    const sq: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(polygonArea(sq)).toBeCloseTo(100, 9);
    const r = minAreaRect(sq);
    expect(r.length).toBeCloseTo(10, 9);
    expect(r.width).toBeCloseTo(10, 9);
  });
});

describe("návrh součinitele polohy CD", () => {
  it("osamělý objekt", () => {
    expect(suggestCd(8, [{ distance: 30, height: 20, include: true }]).key).toBe("isolated");
  });
  it("vyšší objekt v okruhu 3H", () => {
    expect(suggestCd(8, [{ distance: 10, height: 12, include: true }]).key).toBe("surrounded_higher");
  });
  it("objekty stejné nebo nižší výšky, s upozorněním na chybějící výšku", () => {
    const s = suggestCd(8, [
      { distance: 10, height: 6, include: true },
      { distance: 12, height: null, include: true },
    ]);
    expect(s.key).toBe("surrounded_same_or_lower");
    expect(s.reason).toContain("chybí výška");
  });
  it("vyloučené objekty se nepočítají", () => {
    expect(suggestCd(8, [{ distance: 10, height: 30, include: false }]).key).toBe("isolated");
  });
});

describe("zjištění objektu z ČÚZK (simulované odpovědi ve tvaru skutečných služeb)", () => {
  const ring = (r: LonLat[]) => [r];
  const fakeFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const p = url.pathname;
    let body: unknown;
    if (p.endsWith("/MapServer/3/query")) {
      body = {
        features: [
          {
            attributes: { objectid: 2222585, kod: 12099449, pocetpodlazi: 4, zpusobvyuzitikod: 7, zdroj: 1 },
            geometry: { rings: ring(BUILDING_483) },
          },
          {
            attributes: { objectid: 2222592, kod: 12099511, pocetpodlazi: 1, zpusobvyuzitikod: 15, zdroj: 1 },
            geometry: { rings: ring(BUILDING_490) },
          },
        ],
      };
    } else if (p.endsWith("/MapServer/5/query")) {
      body = { features: [{ attributes: { cisloparcely: "2275/1", katastralniuzemi: 655970, vymeraparcely: 5401, druhcislovanikod: 2 } }] };
    } else if (p.endsWith("/MapServer/7/query")) {
      body = { features: [{ attributes: { kod: 655970, nazev: "Jablonec nad Nisou" } }] };
    } else if (p.includes("reverseGeocode")) {
      body = { address: { Address: "Mírové náměstí 408/3, 46601 Jablonec nad Nisou" }, location: { x: 15.1705, y: 50.7243 } };
    } else if (p.includes("/3D/dmp/")) {
      body = { name: "Pixel", value: "527.5" };
    } else if (p.includes("/3D/dmr5g/")) {
      body = { name: "Pixel", value: "516.1" };
    } else {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };

  it("najde budovu v bodě, spočítá rozměry, výšku, parcelu a sousedy", async () => {
    setGeoFetchForTests(fakeFetch, false);
    try {
      const s = await lookupSite(15.17062, 50.72448);
      expect(s.building?.id).toBe("2222585");
      expect(s.building?.use).toBe("rodinný dům");
      expect(s.building?.suggestedType).toBe("family_house");
      expect(s.building?.length).toBeGreaterThan(17.5);
      expect(s.building?.heightEstimate).toBeCloseTo(11.4, 1);
      expect(s.building?.terrainElevation).toBeCloseTo(516.1, 1);
      expect(s.parcel?.label).toBe("p. č. 2275/1");
      expect(s.parcel?.cadastralArea).toBe("Jablonec nad Nisou (655970)");
      expect(s.address).toContain("Jablonec");
      expect(s.neighbours).toHaveLength(1);
      expect(s.neighbours[0].distance).toBeGreaterThan(60);
      expect(s.notes.some((n) => n.includes("orientační odhad"))).toBe(true);
    } finally {
      setGeoFetchForTests(null, true);
    }
  });

  it("výpadek služby: bez budovy, s poznámkou, bez vymyšlených hodnot", async () => {
    setGeoFetchForTests(async () => new Response("err", { status: 503 }), false);
    try {
      const s = await lookupSite(15.17, 50.72);
      expect(s.building).toBeNull();
      expect(s.parcel).toBeNull();
      expect(s.notes.length).toBeGreaterThan(0);
    } finally {
      setGeoFetchForTests(null, true);
    }
  });
});
