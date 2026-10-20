"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BUILDING_TYPES, buildingType } from "@/catalog";
import type { ProjectData } from "@/domain/project";
import { api, ApiError } from "@/lib/api";
import type { SiteLookup } from "@/server/geo/site";
import { Notice, NumberInput, OriginBadge, SelectInput, Spinner } from "../../ui";
import { calcOf, manual, setProvenance } from "../use-project";
import { defaultInsideZone } from "@/domain/project";
import { issueFor, type StepProps } from "../wizard";

const SiteMap = dynamic(() => import("../site-map"), { ssr: false, loading: () => <div className="h-[420px] border border-line bg-line-soft" /> });

interface Suggestion {
  text: string;
  magicKey: string;
  type: "address" | "parcel" | "other";
}

/** Promítne zjištěná data o objektu do projektu (s původem hodnot). */
export function applySite(d: ProjectData, s: SiteLookup) {
  const now = s.retrievedAt;
  d.site.location = s.location;
  d.site.address = s.address ? { text: s.address } : null;
  d.site.parcel = s.parcel ? { label: s.parcel.label, cadastralArea: s.parcel.cadastralArea ?? undefined } : null;
  d.site.dataNotes = s.notes;
  d.site.building = s.building
    ? {
        id: s.building.id,
        footprint: s.building.footprint,
        area: s.building.area,
        length: s.building.length,
        width: s.building.width,
        orientationDeg: s.building.orientationDeg,
        heightEstimate: s.building.heightEstimate,
        terrainElevation: s.building.terrainElevation,
        source: s.building.source,
      }
    : null;
  d.site.neighbours = s.neighbours.map((n) => ({
    id: n.id,
    footprint: n.footprint,
    distance: n.distance,
    heightEstimate: n.heightEstimate,
    heightManual: null,
    include: true,
  }));
  const id = d.identification.building;
  if (s.address) id.address = s.address;
  if (s.parcel) {
    id.parcel = s.parcel.label;
    if (s.parcel.cadastralArea) id.cadastralArea = s.parcel.cadastralArea;
  }
  const calc = calcOf(d);
  calc.structure ??= {};
  const st = calc.structure;
  const auto = (path: string, value: number | null | undefined, source: string, quality: "measured" | "estimated") => {
    if (value == null) return;
    const prev = d.provenance[path];
    if (prev?.origin === "manual" && (st as Record<string, unknown>)[path.split(".").pop()!] != null) return; // ruční hodnotu nepřepisujeme
    (st as Record<string, unknown>)[path.split(".").pop()!] = value;
    setProvenance(d, path, { origin: "auto", source, retrievedAt: now, quality, confirmed: false });
  };
  if (s.building) {
    auto("calc.structure.L", s.building.length, "RÚIAN (ČÚZK) – délka obdélníku opsaného obrysu budovy", "measured");
    auto("calc.structure.W", s.building.width, "RÚIAN (ČÚZK) – šířka obdélníku opsaného obrysu budovy", "measured");
    auto("calc.structure.H", s.building.heightEstimate, "Odhad z výškopisu ČÚZK (DMP 1G − DMR 5G)", "estimated");
  }
}

export function StepObject({ data, update, project, issues }: StepProps) {
  const calc = calcOf(data);
  const st = calc.structure ?? {};
  const locked = project.objectLockedAt != null;
  const [q, setQ] = useState(data.site.query ?? "");
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestedType, setSuggestedType] = useState<{ key: string; use: string } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 3 || locked) {
      setSugs([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const r = await api<{ suggestions: Suggestion[] }>(`/api/geo/suggest?q=${encodeURIComponent(q.trim())}`);
        setSugs(r.suggestions);
      } catch {
        setSugs([]);
      }
    }, 350);
  }, [q, locked]);

  async function lookup(lon: number, lat: number, buildingId?: string) {
    setBusy("Zjišťuji budovu, parcelu a výšku z dat ČÚZK…");
    setError(null);
    try {
      const s = await api<SiteLookup>(`/api/geo/site?lon=${lon}&lat=${lat}${buildingId ? `&building=${encodeURIComponent(buildingId)}` : ""}`);
      update((d) => applySite(d, s));
      if (s.building?.suggestedType && s.building.suggestedType !== data.buildingType) {
        setSuggestedType({ key: s.building.suggestedType, use: s.building.use ?? "" });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Data se nepodařilo načíst. Rozměry můžete zadat ručně.");
    } finally {
      setBusy(null);
    }
  }

  async function choose(s: Suggestion) {
    setSugs([]);
    setQ(s.text);
    update((d) => (d.site.query = s.text));
    setBusy("Hledám adresu…");
    try {
      const loc = await api<{ lon: number; lat: number; label: string }>(`/api/geo/find?text=${encodeURIComponent(s.text)}&magicKey=${encodeURIComponent(s.magicKey)}`);
      await lookup(loc.lon, loc.lat);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Adresu se nepodařilo dohledat.");
      setBusy(null);
    }
  }

  const setDim = (key: "L" | "W" | "H" | "prominentHeight", v: number | null) =>
    update((d) => {
      const c = calcOf(d);
      c.structure ??= {};
      (c.structure as Record<string, unknown>)[key] = key === "prominentHeight" ? v : (v ?? undefined);
      setProvenance(d, `calc.structure.${key}`, v == null ? null : manual());
    });

  const changeType = (key: string) =>
    update((d) => {
      d.buildingType = key;
      const t = buildingType(key);
      const c = calcOf(d);
      c.lossTypes = { ...t.lossTypes };
      c.options = { ...t.options };
      c.structure ??= {};
      c.structure.totalPersons = t.typicalPersons;
      c.structure.totalServedUsers = t.l2 ? 1000 : null;
      const zones = c.zones ?? [];
      const inside = defaultInsideZone(key);
      const idx = zones.findIndex((z) => z.location === "inside");
      if (idx >= 0) zones[idx] = { ...inside, id: zones[idx].id, name: zones[idx].name, internalSystems: zones[idx].internalSystems };
      else zones.unshift(inside);
      c.zones = zones;
      setProvenance(d, "calc.lossTypes", { origin: "preset", source: `Typ objektu: ${t.label}`, confirmed: false });
      setProvenance(d, "calc.zones[0]", { origin: "preset", source: `Typ objektu: ${t.label} – ${t.basis}`, confirmed: false });
    });

  const meta = (k: string) => data.provenance[`calc.structure.${k}`];
  const badge = (k: string) => {
    const m = meta(k);
    return m ? <OriginBadge origin={m.origin} confirmed={m.confirmed} source={m.source} /> : null;
  };
  const b = data.site.building;
  const H = typeof st.H === "number" ? st.H : null;

  return (
    <div className="space-y-6">
      <div className="relative">
        <label className="field-label" htmlFor="addr">
          Adresa nebo parcela
        </label>
        <input
          id="addr"
          className="input"
          placeholder="např. Mírové náměstí 19, Jablonec nad Nisou nebo Jablonec nad Nisou 2275/1"
          value={q}
          disabled={locked}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="addr-list"
        />
        {sugs.length > 0 && (
          <ul id="addr-list" role="listbox" className="absolute z-[1000] mt-1 w-full border border-line bg-sheet shadow-lg">
            {sugs.map((s) => (
              <li key={s.magicKey}>
                <button type="button" role="option" aria-selected={false} className="w-full px-3 py-2 text-left text-sm hover:bg-line-soft" onClick={() => choose(s)}>
                  {s.text} <span className="text-muted">{s.type === "parcel" ? "parcela" : s.type === "address" ? "adresa" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="field-help">Vyhledávání v RÚIAN (ČÚZK). Objekt můžete vybrat i kliknutím do mapy.</p>
      </div>

      {busy && <Spinner label={busy} />}
      {error && <Notice tone="error">{error}</Notice>}

      <SiteMap
        location={data.site.location}
        main={b ? { id: b.id, footprint: b.footprint } : null}
        neighbours={data.site.neighbours.map((n) => ({ id: n.id, footprint: n.footprint, include: n.include, label: `Vzdálenost ${n.distance.toLocaleString("cs-CZ")} m` }))}
        radiusM={H && b ? 3 * H + Math.max(b.length ?? 0, b.width ?? 0) / 2 : null}
        onPick={(lon, lat) => lookup(lon, lat)}
        onPickBuilding={(id, lon, lat) => lookup(lon, lat, id)}
        disabled={locked || busy != null}
      />
      <p className="text-xs text-muted">
        Modře posuzovaný objekt, žlutě okolní budovy (kliknutím vyberete jinou budovu jako posuzovanou), čárkovaně orientační okruh 3H. © ČÚZK
      </p>

      {data.site.location && (
        <div className="panel grid gap-x-6 gap-y-1 p-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted">Adresa:</span> {data.site.address?.text ?? "nezjištěna"}
          </p>
          <p>
            <span className="text-muted">Parcela:</span> {data.site.parcel ? `${data.site.parcel.label}, k. ú. ${data.site.parcel.cadastralArea ?? "?"}` : "nezjištěna"}
          </p>
          {b && (
            <>
              <p>
                <span className="text-muted">Zastavěná plocha obrysu:</span> {b.area?.toLocaleString("cs-CZ")} m²
              </p>
              <p>
                <span className="text-muted">Nadmořská výška terénu:</span> {b.terrainElevation != null ? `${b.terrainElevation.toLocaleString("cs-CZ")} m n. m.` : "nezjištěna"}
              </p>
            </>
          )}
          {data.site.dataNotes.map((n) => (
            <p key={n} className="text-ink-soft sm:col-span-2">
              {n}
            </p>
          ))}
        </div>
      )}

      {suggestedType && (
        <Notice tone="info" title="Návrh druhu objektu">
          V RÚIAN je objekt veden jako „{suggestedType.use}“. Odpovídá tomu druh „{buildingType(suggestedType.key).label}“.{" "}
          <button
            className="link font-semibold"
            onClick={() => {
              changeType(suggestedType.key);
              setSuggestedType(null);
            }}
          >
            Použít
          </button>{" "}
          <button className="link" onClick={() => setSuggestedType(null)}>
            Ponechat současný
          </button>
        </Notice>
      )}

      <SelectInput
        label="Druh objektu"
        value={data.buildingType}
        onChange={changeType}
        options={BUILDING_TYPES.map((t) => ({ value: t.key, label: t.label, group: t.group }))}
        help="Změna druhu objektu přednastaví hodnocené ztráty a parametry vnitřní zóny podle normových tabulek."
      />
      {buildingType(data.buildingType).warnings.map((w) => (
        <Notice key={w} tone="warning">
          {w}
        </Notice>
      ))}

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Rozměry objektu pro výpočet sběrné plochy</legend>
        <NumberInput label="Délka L" unit="m" value={st.L ?? null} onChange={(v) => setDim("L", v)} badge={badge("L")} error={issueFor(issues, "structure.L")} />
        <NumberInput label="Šířka W" unit="m" value={st.W ?? null} onChange={(v) => setDim("W", v)} badge={badge("W")} error={issueFor(issues, "structure.W")} />
        <NumberInput
          label="Výška H"
          unit="m"
          value={st.H ?? null}
          onChange={(v) => setDim("H", v)}
          badge={badge("H")}
          error={issueFor(issues, "structure.H")}
          help="Nejvyšší bod objektu nad terénem (včetně střešních nástaveb)."
        />
      </fieldset>
      {meta("H")?.origin === "auto" && (
        <Notice tone="warning">Výška je odhad z digitálního modelu povrchu. Ověřte ji podle výkresů a potvrďte v kroku Kontrola údajů.</Notice>
      )}
      <NumberInput
        label="Výška výrazně vyčnívající části Hp (nepovinné)"
        unit="m"
        value={st.prominentHeight ?? null}
        onChange={(v) => setDim("prominentHeight", v)}
        help="Komín, věž apod. Sběrná plocha se pak určí jako větší z ploch objektu a vyčnívající části."
      />
    </div>
  );
}
