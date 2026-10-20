"use client";

import type { LossValueInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import type { NormTable } from "@/core/risk/types";
import { fmtNum } from "@/core/util/format";
import { NumberInput, SelectInput, TextInput } from "../ui";

/** Výběr hodnoty ztráty: řádek normové tabulky, nebo vlastní hodnota se zdůvodněním. */
export function LossSelect({
  label,
  table,
  value,
  onChange,
  error,
}: {
  label: string;
  table: NormTable<string>;
  value: LossValueInput | null | undefined;
  onChange: (v: LossValueInput) => void;
  error?: string | null;
}) {
  const options = [
    ...Object.entries(table.rows).map(([k, r]) => ({ value: k, label: `${r.label} (${fmtNum(r.value)})` })),
    { value: "__custom", label: "Vlastní hodnota…" },
  ];
  const current = value?.source === "custom" ? "__custom" : (value?.key ?? null);
  return (
    <div className="space-y-2">
      <SelectInput
        label={label}
        value={current}
        error={error}
        onChange={(v) => (v === "__custom" ? onChange({ source: "custom", value: 0, note: "" }) : onChange({ source: "table", key: v }))}
        options={options}
        help={`${table.normRef}`}
      />
      {value?.source === "custom" && (
        <div className="grid gap-2 border-l-2 border-signal pl-3 sm:grid-cols-[8rem_1fr]">
          <NumberInput label="Hodnota" value={value.value} onChange={(v) => onChange({ ...value, value: v ?? 0 })} />
          <TextInput label="Zdůvodnění" value={value.note} onChange={(v) => onChange({ ...value, note: v })} placeholder="např. stanoveno investorem / podle PBŘ" />
        </div>
      )}
    </div>
  );
}
