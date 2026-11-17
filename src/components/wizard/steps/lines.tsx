"use client";

import { useEffect, useMemo, useState } from "react";
import { LINE_PRESET_GROUPS, LINE_PRESETS, NON_METALLIC_NOTE, SYSTEM_PRESETS } from "@/catalog";
import { MAX_ADJACENT_STRUCTURES, type LineInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import { localFrame, minAreaRect } from "@/domain/geometry";
import type { FieldMeta } from "@/domain/project";
import { api, ApiError } from "@/lib/api";
import * as T from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { Checkbox, Disclosure, Notice, NumberInput, SelectInput, TextInput } from "../../ui";
import { CD_OPTIONS, CE_OPTIONS, CI_OPTIONS, CL_OPTIONS, CT_OPTIONS, RS_OPTIONS } from "../options";
import { calcOf, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

const SOURCE_OPTIONS = [
  { value: "verified", label: "Ověřeno – vyjádření nebo projekt správce sítě", meta: { origin: "manual", quality: "measured", confirmed: true, source: "Vyjádření / projekt správce sítě" } },
  { value: "map", label: "Orientačně – z mapy nebo prohlídky na místě", meta: { origin: "manual", quality: "estimated", confirmed: true, source: "Orientačně z mapy / prohlídky" } },
  { value: "operator", label: "Neověřeno – nutno získat od správce sítě", meta: { origin: "preset", quality: "unknown", confirmed: false, source: "Předvolba – údaje nutno ověřit u správce sítě" } },
  { value: "designer", label: "Zadal projektant (vlastní znalost)", meta: { origin: "manual", quality: "measured", confirmed: true, source: "Zadal projektant" } },
] as const;

function sourceKey(m: FieldMeta | undefined): string {
  if (!m) return "operator";
  return SOURCE_OPTIONS.find((o) => o.meta.source === m.source)?.value ?? "designer";
}

const uid = () => Math.random().toString(36).slice(2, 9);
const BONDED = new Set<string>(["shielded_buried_bonded", "shielded_aerial_bonded", "lightning_protective_cable"]);

export function StepLines({ data, update, issues }: StepProps) {
  const calc = calcOf(data);
  const lines = calc.lines ?? [];
  const [templates, setTemplates] = useState<{ id: string; name: string; data: Omit<LineInput, "id"> }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const adjacentCount = lines.filter((l) => l.adjacentStructure != null).length;
  const neighbourDims = useMemo(() => {
    const nb = data.site.neighbours ?? [];
    if (nb.length === 0) return [];
    const [lon0, lat0] = nb[0].footprint[0] ?? [0, 0];
    const frame = localFrame(lon0, lat0);
    return nb
      .slice()
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30)
      .map((n) => {
        const r = minAreaRect(n.footprint.map((p) => frame.toXY(p as [number, number])));
        const h = n.heightManual ?? n.heightEstimate ?? null;
        return {
          id: n.id,
          distance: Math.round(n.distance),
          L: Math.round(r.length * 10) / 10,
          W: Math.round(r.width * 10) / 10,
          H: h != null ? Math.round(h * 10) / 10 : null,
        };
      })
      .filter((n) => n.L > 0 && n.W > 0);
  }, [data.site.neighbours]);
  useEffect(() => {
    api<{ templates: { id: string; name: string; data: Omit<LineInput, "id"> }[] }>("/api/templates?kind=LINE")
      .then((r) => setTemplates(r.templates))
      .catch(() => undefined);
  }, []);

  const addLine = (
    base: Omit<LineInput, "id" | "name" | "environment" | "lengthM" | "adjacentStructure"> & Partial<LineInput>,
    name: string,
    opts: { fromTemplate?: boolean; lengthM?: number | null; systemPreset?: string } = {},
  ) =>
    update((d) => {
      const c = calcOf(d);
      const id = `l-${uid()}`;
      const line: LineInput = {
        environment: "suburban",
        lengthM: opts.lengthM ?? null,
        adjacentStructure: null,
        ...base,
        id,
        name,
      };
      c.lines = [...(c.lines ?? []), line];
      setProvenance(d, `calc.lines.${id}`, opts.fromTemplate ? { origin: "preset", source: `Šablona „${name}“ – ověřte`, confirmed: false } : SOURCE_OPTIONS[2].meta);
      // vnitřní systém připojený k vedení ve vnitřní zóně
      const zones = c.zones ?? [];
      const inside = zones.find((z) => z.location === "inside") ?? zones[0];
      if (inside) {
        const preset =
          (opts.systemPreset ? SYSTEM_PRESETS.find((s) => s.key === opts.systemPreset) : undefined) ??
          SYSTEM_PRESETS.find((s) => s.service === base.service) ??
          SYSTEM_PRESETS[0];
        const sysName = preset.key === "pv_inverter" ? `Střídač a rozvody FVE – ${name}` : `${preset.label.split(" (")[0]} – ${name}`;
        inside.internalSystems = [...(inside.internalSystems ?? []), { id: `s-${uid()}`, name: sysName, lineId: id, ...preset.values }];
        setProvenance(d, `calc.zones.${inside.id}.systems`, { origin: "preset", source: "Systém přidán automaticky k vedení – ověřte UW a kabeláž", confirmed: false });
      }
    });

  const setLine = (i: number, patch: Partial<LineInput>) =>
    update((d) => {
      const c = calcOf(d);
      c.lines = (c.lines ?? []).map((l, j) => (j === i ? { ...l, ...patch } : l));
    });

  const removeLine = (i: number) =>
    update((d) => {
      const c = calcOf(d);
      const id = c.lines?.[i]?.id;
      c.lines = (c.lines ?? []).filter((_, j) => j !== i);
      for (const z of c.zones ?? []) z.internalSystems = (z.internalSystems ?? []).filter((s) => s.lineId !== id);
      if (id) setProvenance(d, `calc.lines.${id}`, null);
    });

  const addPanel = (
    <div className="panel p-4">
      <p className="font-semibold">{lines.length === 0 ? "Jaká vedení do objektu vstupují?" : "Přidat další vedení"}</p>
      <p className="mt-1 text-sm text-ink-soft">Vyberte nejbližší typ – parametry se předvyplní a dají se upravit. Každé vedení, které vstupuje do objektu, zadejte zvlášť.</p>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {LINE_PRESET_GROUPS.map((g) => (
          <div key={g}>
            <p className="type-wide text-xs font-bold tracking-wide text-muted uppercase">{g}</p>
            <div className="mt-1.5 grid gap-1.5">
              {LINE_PRESETS.filter((pr) => pr.group === g).map((pr) => (
                <button
                  key={pr.key}
                  className="btn btn-secondary h-auto flex-col items-start justify-start gap-0.5 py-2 text-left text-sm font-normal whitespace-normal"
                  onClick={() => addLine(pr.values, pr.short, { lengthM: pr.lengthM ?? null, systemPreset: pr.systemPreset })}
                  title={`${pr.label}. ${pr.basis}`}
                >
                  <span className="font-semibold">+ {pr.short}</span>
                  <span className="text-xs text-muted">{pr.help}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {templates.length > 0 && (
        <div className="mt-4 border-t border-line-soft pt-3">
          <p className="type-wide text-xs font-bold tracking-wide text-muted uppercase">Moje šablony</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button key={t.id} className="btn btn-secondary px-2.5 py-1 text-sm font-normal" onClick={() => addLine(t.data, t.data.name || t.name, { fromTemplate: true, lengthM: t.data.lengthM ?? null })}>
                + {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-ink-soft">
        Zadejte všechna kovová vedení, která do objektu vstupují: silovou přípojku, kabely od fotovoltaiky, telekomunikační a datová vedení. Údaje berte z vyjádření správce sítě
        nebo z projektu přípojky. {NON_METALLIC_NOTE}
      </p>
      {msg && <Notice tone="error">{msg}</Notice>}

      {lines.length === 0 && addPanel}

      {lines.map((l, i) => {
        const p = `lines[${i}]`;
        const bonded = BONDED.has(l.shielding);
        const meta = data.provenance[`calc.lines.${l.id}`];
        const hasAdvancedIssue = !!issueFor(issues, `${p}.soilResistivity`);
        const summary = [
          T.TABLE_CT.rows[l.lineType]?.value !== 1 ? "VN s trafem" : null,
          l.soilResistivity ? `ρ = ${l.soilResistivity} Ω·m` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <fieldset key={l.id} className="panel space-y-4 p-5">
            <legend className="px-1 font-semibold">
              {i + 1}. {l.name || `Vedení ${i + 1}`}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Název" value={l.name} onChange={(v) => setLine(i, { name: v })} />
              <SelectInput
                label="Druh vedení"
                value={l.service}
                onChange={(v) => setLine(i, { service: v })}
                options={[
                  { value: "power", label: "Silové (napájení, FVE)" },
                  { value: "tlc", label: "Telekomunikační / datové" },
                ]}
              />
              <SelectInput label="Uložení (CI)" value={l.installation} onChange={(v) => setLine(i, { installation: v })} options={CI_OPTIONS} />
              <div>
                <NumberInput
                  label="Délka úseku vedení LL"
                  unit="m"
                  value={l.lengthM}
                  disabled={l.lengthM == null}
                  onChange={(v) => setLine(i, { lengthM: v ?? 0 })}
                  error={issueFor(issues, `${p}.lengthM`)}
                  help="Od objektu k nejbližšímu uzlu (rozvodná skříň, transformátor, pole panelů)."
                />
                <div className="mt-1.5">
                  <Checkbox label="Délka není známa (uvažuje se 1 000 m)" checked={l.lengthM == null} onChange={(v) => setLine(i, { lengthM: v ? null : 100 })} />
                </div>
              </div>
              <SelectInput
                label="Stínění, uzemnění a izolace (CLD, CLI)"
                value={l.shielding}
                onChange={(v) => setLine(i, { shielding: v, shieldResistance: BONDED.has(v) ? (l.shieldResistance ?? "rs_5_20") : null })}
                options={CL_OPTIONS}
              />
              {bonded && (
                <SelectInput
                  label="Odpor stínění RS"
                  value={l.shieldResistance}
                  onChange={(v) => setLine(i, { shieldResistance: v })}
                  options={RS_OPTIONS}
                  error={issueFor(issues, `${p}.shieldResistance`)}
                  help="Podle katalogového listu kabelu."
                />
              )}
              <SelectInput
                label="Prostředí podél vedení (CE)"
                value={l.environment}
                onChange={(v) => setLine(i, { environment: v })}
                options={CE_OPTIONS}
                help="Charakter zástavby podél trasy vedení."
              />
              <SelectInput
                label="Zdroj údajů o vedení"
                value={sourceKey(meta)}
                onChange={(v) => update((d) => setProvenance(d, `calc.lines.${l.id}`, { ...(SOURCE_OPTIONS.find((o) => o.value === v)!.meta as FieldMeta) }))}
                options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>

            <Disclosure title="Další parametry vedení" summary={summary || "typ vedení, měrný odpor půdy – obvykle beze změny"} defaultOpen={hasAdvancedIssue}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput
                  label="Typ vedení (CT)"
                  value={l.lineType}
                  onChange={(v) => setLine(i, { lineType: v })}
                  options={CT_OPTIONS}
                  help="VN s transformátorem jen u objektů s vlastní trafostanicí."
                />
                {l.installation !== "aerial" && (
                  <NumberInput
                    label="Měrný odpor půdy ρ (nepovinné)"
                    unit="Ω·m"
                    value={l.soilResistivity ?? null}
                    onChange={(v) => setLine(i, { soilResistivity: v && v > 0 ? v : null })}
                    help="Pozn. 2 k čl. A.4: AL je úměrná √ρ, tabulka vychází z 400 Ω·m. Prázdné = bez korekce (AL = 40·LL)."
                  />
                )}
              </div>
            </Disclosure>

            <Disclosure
              title="Sousední budova na konci vedení (NDJ)"
              summary={l.adjacentStructure ? `${l.adjacentStructure.L} × ${l.adjacentStructure.W} × ${l.adjacentStructure.H} m` : "neuvažuje se"}
              defaultOpen={l.adjacentStructure != null}
            >
              <Checkbox
                label="Vedení končí v sousední budově (započítat údery do ní)"
                help={`Jen pokud je sousední budova s objektem propojena tímto vedením. Ostatní okolní budovy se projeví pouze v součiniteli polohy CD. Nejvýše ${MAX_ADJACENT_STRUCTURES} sousedních budov.`}
                checked={l.adjacentStructure != null}
                onChange={(v) => {
                  if (v && adjacentCount >= MAX_ADJACENT_STRUCTURES) {
                    setMsg(`Lze zadat nejvýše ${MAX_ADJACENT_STRUCTURES} sousedních budov připojených vedením.`);
                    return;
                  }
                  setLine(i, { adjacentStructure: v ? { L: 10, W: 10, H: 6, cd: "surrounded_same_or_lower" } : null });
                }}
              />
              {l.adjacentStructure && neighbourDims.length > 0 && (
                <SelectInput
                  label="Převzít rozměry z budovy v mapě"
                  value=""
                  onChange={(id) => {
                    const n = neighbourDims.find((x) => x.id === id);
                    if (n) setLine(i, { adjacentStructure: { ...l.adjacentStructure!, L: n.L, W: n.W, ...(n.H != null ? { H: n.H } : {}) } });
                  }}
                  options={[
                    { value: "", label: "— vyberte budovu z okolí —" },
                    ...neighbourDims.map((n) => ({
                      value: n.id,
                      label: `${n.distance} m od objektu · ${n.L} × ${n.W} m${n.H != null ? ` · výška ≈ ${n.H} m` : ""}`,
                    })),
                  ]}
                  help="Rozměry jsou odhad z obrysu budovy v mapě – ověřte je."
                />
              )}
              {l.adjacentStructure && (
                <div className="grid gap-3 sm:grid-cols-4">
                  <NumberInput label="Délka LJ" unit="m" value={l.adjacentStructure.L} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, L: v ?? 0 } })} />
                  <NumberInput label="Šířka WJ" unit="m" value={l.adjacentStructure.W} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, W: v ?? 0 } })} />
                  <NumberInput label="Výška HJ" unit="m" value={l.adjacentStructure.H} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, H: v ?? 0 } })} />
                  <SelectInput label="Poloha CDJ" value={l.adjacentStructure.cd} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, cd: v } })} options={CD_OPTIONS} />
                </div>
              )}
            </Disclosure>

            <div className="flex flex-wrap gap-2 border-t border-line-soft pt-3">
              <button
                className="btn btn-ghost px-2.5 py-1 text-sm"
                onClick={async () => {
                  try {
                    const { id: _id, ...rest } = l;
                    void _id;
                    await api("/api/templates", { body: { kind: "LINE", name: l.name || "Vedení", data: rest } });
                    const r = await api<{ templates: typeof templates }>("/api/templates?kind=LINE");
                    setTemplates(r.templates);
                  } catch (e) {
                    setMsg(e instanceof ApiError ? e.message : "Šablonu se nepodařilo uložit.");
                  }
                }}
              >
                Uložit jako šablonu
              </button>
              <button className="btn btn-ghost px-2.5 py-1 text-sm text-bad" onClick={() => removeLine(i)}>
                Odebrat vedení
              </button>
            </div>
          </fieldset>
        );
      })}

      {lines.length > 0 && addPanel}
    </div>
  );
}
