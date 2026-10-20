"use client";

import { Field, Notice, NumberInput, TextInput } from "../../ui";
import { calcOf, manual, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

export function StepLightning({ data, update, issues }: StepProps) {
  const calc = calcOf(data);
  const l = calc.lightning ?? { mode: "ng" as const, ng: null, td: null, source: "" };
  const set = (patch: Partial<typeof l>) =>
    update((d) => {
      const c = calcOf(d);
      c.lightning = { ...(c.lightning ?? { mode: "ng", ng: null, td: null, source: "" }), ...patch };
      setProvenance(d, "calc.lightning", manual());
    });
  return (
    <div className="max-w-2xl space-y-5">
      <Notice tone="info">
        Pro Českou republiku není k dispozici otevřený zdroj hustoty výbojů, který by bylo možné komerčně načítat automaticky. Zadejte hodnotu z mapy bouřkové činnosti, z dat
        detekční sítě nebo jiného podkladu a uveďte zdroj – ten se objeví v dokumentu.
      </Notice>
      <Field label="Způsob zadání">
        <div className="flex flex-wrap gap-4 text-[0.9375rem]">
          <label className="flex items-center gap-2">
            <input type="radio" name="ngmode" checked={l.mode === "ng"} onChange={() => set({ mode: "ng" })} /> Zadat hustotu výbojů
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="ngmode" checked={l.mode === "td"} onChange={() => set({ mode: "td" })} /> Zadat počet bouřkových dnů
          </label>
        </div>
      </Field>
      {l.mode === "ng" ? (
        <NumberInput label="NG – hustota výbojů do země" unit="1/(km²·rok)" value={l.ng} onChange={(v) => set({ ng: v })} error={issueFor(issues, "lightning.ng")} />
      ) : (
        <NumberInput
          label="Td – počet bouřkových dnů"
          unit="dny/rok"
          value={l.td}
          onChange={(v) => set({ td: v })}
          error={issueFor(issues, "lightning.td")}
          help={l.td ? `NG ≈ 0,1 · Td = ${(0.1 * l.td).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} 1/(km²·rok) – přibližný vztah z přílohy A normy.` : "Přepočet NG ≈ 0,1 · Td je přibližný."}
        />
      )}
      <TextInput
        label="Zdroj hodnoty"
        value={l.source}
        onChange={(v) => set({ source: v })}
        error={issueFor(issues, "lightning.source")}
        placeholder="např. mapa bouřkových dnů ČR, data detekční sítě (rok, lokalita)"
      />
    </div>
  );
}
