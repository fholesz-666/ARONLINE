"use client";

import { useEffect, useMemo, useState } from "react";
import { LINE_PRESETS, NON_METALLIC_NOTE, SYSTEM_PRESETS } from "@/catalog";
import { MAX_ADJACENT_STRUCTURES, type LineInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import { localFrame, minAreaRect } from "@/domain/geometry";
import type { FieldMeta } from "@/domain/project";
import { api, ApiError } from "@/lib/api";
import { Checkbox, Notice, NumberInput, SelectInput, TextInput } from "../../ui";
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

  const addLine = (base: Omit<LineInput, "id" | "name" | "environment" | "lengthM" | "adjacentStructure"> & Partial<LineInput>, name: string, fromTemplate = false) =>
    update((d) => {
      const c = calcOf(d);
      const id = `l-${uid()}`;
      const line: LineInput = {
        environment: "suburban",
        lengthM: null,
        adjacentStructure: null,
        ...base,
        id,
        name,
      };
      c.lines = [...(c.lines ?? []), line];
      setProvenance(d, `calc.lines.${id}`, fromTemplate ? { origin: "preset", source: `Šablona „${name}“ – ověřte`, confirmed: false } : SOURCE_OPTIONS[2].meta);
      // vnitřní systém připojený k vedení ve vnitřní zóně
      const zones = c.zones ?? [];
      const inside = zones.find((z) => z.location === "inside") ?? zones[0];
      if (inside) {
        const preset = SYSTEM_PRESETS.find((s) => s.service === base.service) ?? SYSTEM_PRESETS[0];
        inside.internalSystems = [
          ...(inside.internalSystems ?? []),
          { id: `s-${uid()}`, name: `${preset.label.split(" (")[0]} – ${name}`, lineId: id, ...preset.values },
        ];
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

  return (
    <div className="space-y-6">
      <Notice tone="info">
        Průběh a parametry přípojek nelze spolehlivě zjistit z veřejných dat. Vycházejte z vyjádření správce sítě nebo projektu přípojky. U každého vedení uveďte, odkud
        údaje pocházejí. {NON_METALLIC_NOTE}
      </Notice>
      {msg && <Notice tone="error">{msg}</Notice>}

      {lines.length === 0 && <p className="text-ink-soft">Objekt zatím nemá žádné přívodní vedení. Přidejte silovou přípojku a případně telekomunikační vedení.</p>}

      {lines.map((l, i) => {
        const p = `lines[${i}]`;
        const bonded = BONDED.has(l.shielding);
        const meta = data.provenance[`calc.lines.${l.id}`];
        return (
          <fieldset key={l.id} className="panel space-y-4 p-5">
            <legend className="px-1 font-semibold">{l.name || `Vedení ${i + 1}`}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Název" value={l.name} onChange={(v) => setLine(i, { name: v })} />
              <SelectInput
                label="Zdroj údajů o vedení"
                value={sourceKey(meta)}
                onChange={(v) =>
                  update((d) => setProvenance(d, `calc.lines.${l.id}`, { ...(SOURCE_OPTIONS.find((o) => o.value === v)!.meta as FieldMeta) }))
                }
                options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              <SelectInput
                label="Druh vedení"
                value={l.service}
                onChange={(v) => setLine(i, { service: v })}
                options={[
                  { value: "power", label: "Silové (napájení)" },
                  { value: "tlc", label: "Telekomunikační / datové" },
                ]}
              />
              <SelectInput label="Typ vedení (CT)" value={l.lineType} onChange={(v) => setLine(i, { lineType: v })} options={CT_OPTIONS} />
              <SelectInput label="Uložení (CI)" value={l.installation} onChange={(v) => setLine(i, { installation: v })} options={CI_OPTIONS} />
              <SelectInput
                label="Prostředí (CE)"
                value={l.environment}
                onChange={(v) => setLine(i, { environment: v })}
                options={CE_OPTIONS}
                help="Charakter zástavby podél vedení."
              />
              <div className="space-y-2">
                <NumberInput
                  label="Délka úseku vedení LL"
                  unit="m"
                  value={l.lengthM}
                  disabled={l.lengthM == null}
                  onChange={(v) => setLine(i, { lengthM: v ?? 0 })}
                  error={issueFor(issues, `${p}.lengthM`)}
                  help="Od objektu k nejbližšímu uzlu (rozvodná skříň, transformátor)."
                />
                <Checkbox label="Délka není známa (uvažuje se 1 000 m)" checked={l.lengthM == null} onChange={(v) => setLine(i, { lengthM: v ? null : 100 })} />
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
            </div>
            <Checkbox
              label="Vedení končí v sousední budově (započítat údery do ní – NDJ)"
              help={`Sousední budova ovlivňuje riziko jen tehdy, je-li s chráněnou stavbou propojena vedením. Ostatní okolní budovy se projeví pouze v součiniteli polohy CD. Nejvýše ${MAX_ADJACENT_STRUCTURES} sousedních budov.`}
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
                <NumberInput label="LJ" unit="m" value={l.adjacentStructure.L} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, L: v ?? 0 } })} />
                <NumberInput label="WJ" unit="m" value={l.adjacentStructure.W} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, W: v ?? 0 } })} />
                <NumberInput label="HJ" unit="m" value={l.adjacentStructure.H} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, H: v ?? 0 } })} />
                <SelectInput label="CDJ" value={l.adjacentStructure.cd} onChange={(v) => setLine(i, { adjacentStructure: { ...l.adjacentStructure!, cd: v } })} options={CD_OPTIONS} />
              </div>
            )}
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

      <div className="panel p-4">
        <p className="font-semibold">Přidat vedení</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {LINE_PRESETS.map((pr) => (
            <button key={pr.key} className="btn btn-secondary h-auto justify-start whitespace-normal py-2 text-left text-sm font-normal" onClick={() => addLine(pr.values, pr.label.split(" – ")[0])} title={pr.help}>
              {pr.label}
            </button>
          ))}
          {templates.map((t) => (
            <button key={t.id} className="btn btn-secondary h-auto justify-start whitespace-normal py-2 text-left text-sm font-normal" onClick={() => addLine(t.data, t.data.name || t.name, true)}>
              Šablona: {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
