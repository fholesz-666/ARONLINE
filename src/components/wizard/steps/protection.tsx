"use client";

import type { ZoneInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import * as T from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { Checkbox, Notice, NumberInput, SelectInput } from "../../ui";
import { PB_OPTIONS, PEB_OPTIONS, PSPD_OPTIONS, PTU_OPTIONS, RP_OPTIONS } from "../options";
import { calcOf, manual, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

function ShieldInput({ label, value, onChange }: { label: string; value: ZoneInput["shieldExternal"]; onChange: (v: ZoneInput["shieldExternal"]) => void }) {
  const mode = value.continuous ? "continuous" : value.wm != null ? "mesh" : "none";
  return (
    <div className="space-y-2">
      <SelectInput
        label={label}
        value={mode}
        onChange={(m) => onChange(m === "continuous" ? { wm: null, continuous: true } : m === "mesh" ? { wm: value.wm ?? 5, continuous: false } : { wm: null, continuous: false })}
        options={[
          { value: "none", label: "Bez prostorového stínění" },
          { value: "mesh", label: "Mřížové stínění (síť, mřížová LPS, kovová konstrukce)" },
          { value: "continuous", label: "Spojité kovové stínění tloušťky alespoň 0,1 mm" },
        ]}
      />
      {mode === "mesh" && <NumberInput label="Šířka oka wm" unit="m" value={value.wm} onChange={(v) => onChange({ wm: v, continuous: false })} help="KS = 0,12 · wm (max. 1)" />}
    </div>
  );
}

export function StepProtection({ data, update, issues }: StepProps) {
  const calc = calcOf(data);
  const zones = calc.zones ?? [];
  const lines = calc.lines ?? [];
  const mark = (path: string) => (d: Parameters<Parameters<typeof update>[0]>[0]) => setProvenance(d, path, manual());

  return (
    <div className="space-y-8">
      <Notice tone="info">
        Zadejte opatření, se kterými výpočet počítá (navržený stav). Výsledek se porovná i s referenčním stavem bez opatření. Třídu LPS a SPD je pak nutné promítnout do
        projektu ochrany před bleskem.
      </Notice>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-semibold">Vnější ochrana před bleskem (LPS)</legend>
        <SelectInput
          label="Třída LPS / provedení (PB)"
          value={calc.structure?.lps ?? "none"}
          onChange={(v) =>
            update((d) => {
              (calcOf(d).structure ??= {}).lps = v;
              mark("calc.structure.lps")(d);
            })
          }
          options={PB_OPTIONS}
          error={issueFor(issues, "structure.lps")}
        />
      </fieldset>

      {lines.length > 0 && (
        <fieldset className="panel space-y-4 p-5">
          <legend className="px-1 font-semibold">SPD pro vyrovnání potenciálů na vstupu vedení (PEB)</legend>
          {lines.map((l, i) => (
            <SelectInput
              key={l.id}
              label={l.name}
              value={l.peb}
              onChange={(v) =>
                update((d) => {
                  calcOf(d).lines![i].peb = v;
                  mark(`calc.lines.${l.id}.peb`)(d);
                })
              }
              options={PEB_OPTIONS}
            />
          ))}
        </fieldset>
      )}

      {zones.map((z, zi) => {
        const set = (fn: (zz: ZoneInput) => void) =>
          update((d) => {
            fn(calcOf(d).zones![zi]);
            mark(`calc.zones[${zi}].protection`)(d);
          });
        return (
          <fieldset key={z.id} className="panel space-y-5 p-5">
            <legend className="px-1 font-semibold">Zóna: {z.name}</legend>
            <div>
              <p className="field-label">Opatření proti dotykovému a krokovému napětí (PTA)</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {(Object.entries(T.TABLE_PTA.rows) as [T.PtaKey, T.TableRow][]).map(([k, r]) => (
                  <Checkbox
                    key={k}
                    label={`${r.label} (${r.value.toLocaleString("cs-CZ")})`}
                    checked={z.pta.includes(k)}
                    onChange={(v) =>
                      set((zz) => {
                        if (k === "none") zz.pta = ["none"];
                        else {
                          const next = new Set(zz.pta.filter((x) => x !== "none"));
                          if (v) next.add(k);
                          else next.delete(k);
                          zz.pta = next.size ? [...next] : ["none"];
                        }
                      })
                    }
                  />
                ))}
              </div>
              {issueFor(issues, `zones[${zi}].pta`) && <p className="mt-1 text-sm text-bad">{issueFor(issues, `zones[${zi}].pta`)}</p>}
              <p className="field-help">Při více opatřeních se hodnoty násobí.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Opatření proti dotykovému napětí z vedení (PTU)" value={z.ptu} onChange={(v) => set((zz) => (zz.ptu = v))} options={PTU_OPTIONS} />
              <SelectInput label="Opatření ke zmírnění následků požáru (rp)" value={z.fireProvisions} onChange={(v) => set((zz) => (zz.fireProvisions = v))} options={RP_OPTIONS} help="Při více opatřeních zvolte to s nejnižší hodnotou." />
              <ShieldInput label="Vnější prostorové stínění zóny (KS1)" value={z.shieldExternal} onChange={(v) => set((zz) => (zz.shieldExternal = v))} />
              <ShieldInput label="Vnitřní prostorové stínění (KS2)" value={z.shieldInternal} onChange={(v) => set((zz) => (zz.shieldInternal = v))} />
            </div>
            {z.internalSystems.length > 0 && (
              <div className="space-y-3 border-t border-line-soft pt-4">
                <p className="font-semibold">Koordinovaný systém SPD (PSPD)</p>
                {z.internalSystems.map((s, si) => (
                  <SelectInput key={s.id} label={s.name} value={s.pspd} onChange={(v) => set((zz) => (zz.internalSystems[si].pspd = v))} options={PSPD_OPTIONS} />
                ))}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
