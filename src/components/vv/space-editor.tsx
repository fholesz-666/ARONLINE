"use client";

import { useId, useMemo } from "react";
import { NOT_CONSIDERED, SECTION_LABELS, VV_CATALOG, type VvInfluence, type VvSection } from "@/core/vv/catalog";
import { evaluateSpace } from "@/core/vv/evaluate";
import { presetValues, VV_PRESETS } from "@/core/vv/presets";
import type { VvSpace } from "@/core/vv/schema";

function InfluenceRow({ inf, value, onChange }: { inf: VvInfluence; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const level = inf.levels.find((l) => l.code === value);
  const abnormal = !!level && !level.normal;
  return (
    <tr className={abnormal ? "vv-row-abnormal" : undefined}>
      <td className="border-b border-[var(--vv-line)] px-3 py-2 align-top">
        <label htmlFor={id} className="text-sm font-medium">
          {inf.name}
        </label>
        {inf.help && <p className="text-xs text-muted">{inf.help}</p>}
      </td>
      <td className="w-[55%] border-b border-[var(--vv-line)] px-3 py-2 align-top">
        <select id={id} className="input py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          {inf.allowNotConsidered && <option value={NOT_CONSIDERED}>neuvažuje se</option>}
          {inf.levels.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code} – {l.label}
              {l.normal ? "" : "  (není normální)"}
            </option>
          ))}
        </select>
        {abnormal && level?.measure && <p className="mt-1 text-xs text-bad">Opatření: {level.measure}</p>}
      </td>
    </tr>
  );
}

export function SpaceEditor({
  space,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
  canRemove,
}: {
  space: VvSpace;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (s: VvSpace) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canRemove: boolean;
}) {
  const ev = useMemo(() => evaluateSpace(space.values), [space.values]);
  const nameId = useId();
  const presetId = useId();
  const noteId = useId();
  const setValue = (key: string, v: string) => onChange({ ...space, values: { ...space.values, [key]: v } });
  const preset = VV_PRESETS.find((p) => p.id === space.preset);

  const sections = (["A", "B", "C"] as VvSection[]).map((sec) => ({
    sec,
    main: VV_CATALOG.filter((i) => i.section === sec && !i.group),
    am: VV_CATALOG.filter((i) => i.section === sec && i.group),
  }));
  const amAbnormal = ev.abnormal.filter((r) => r.influence.group).length;

  return (
    <div className="vv-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onToggle} aria-expanded={open}>
          <span className="vv-step-num shrink-0 border-[var(--vv-accent)] text-[var(--vv-accent-strong)]">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{space.name || "Nový prostor"}</span>
            <span className="text-xs text-muted">{preset?.label ?? "vlastní nastavení"}</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`vv-chip ${ev.normal ? "vv-chip-ok" : "vv-chip-bad"}`}>
            {ev.normal ? "normální" : `abnormální (${ev.abnormal.length})`}
          </span>
          <span className="vv-chip vv-chip-accent">{ev.minIp}</span>
          <button type="button" className="vv-btn vv-btn-ghost px-3 py-1 text-sm" onClick={onToggle}>
            {open ? "Sbalit" : "Upravit"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--vv-line)] px-4 pb-4 pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor={nameId}>
                Název prostoru
              </label>
              <input
                id={nameId}
                className="input"
                value={space.name}
                maxLength={160}
                placeholder="např. 1.02 Koupelna"
                onChange={(e) => onChange({ ...space, name: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor={presetId}>
                Typ prostoru (předvolba hodnot)
              </label>
              <select
                id={presetId}
                className="input"
                value={space.preset ?? ""}
                onChange={(e) => {
                  const id = e.target.value || undefined;
                  onChange({ ...space, preset: id, values: presetValues(id) });
                }}
              >
                <option value="">vlastní nastavení</option>
                {VV_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="field-help">Změna typu přepíše hodnoty vlivů výchozími pro daný prostor.</p>
            </div>
          </div>
          {preset?.note && <p className="mt-2 text-sm text-ink-soft">ℹ️ {preset.note}</p>}

          {sections.map(({ sec, main, am }) => (
            <div key={sec} className="mt-4">
              <p className="text-sm font-bold text-[var(--vv-accent-strong)]">{SECTION_LABELS[sec]}</p>
              <div className="mt-1 overflow-x-auto rounded-lg border border-[var(--vv-line)]">
                <table className="w-full min-w-[560px] bg-white">
                  <tbody>
                    {main.map((inf) => (
                      <InfluenceRow key={inf.id} inf={inf} value={space.values[inf.id] ?? ""} onChange={(v) => setValue(inf.id, v)} />
                    ))}
                  </tbody>
                </table>
              </div>
              {am.length > 0 && (
                <details className="mt-2 rounded-lg border border-[var(--vv-line)] bg-white" open={amAbnormal > 0}>
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                    Elektromagnetické vlivy AM ({am.length}){" "}
                    <span className="font-normal text-muted">– obvykle beze změny{amAbnormal ? `, ${amAbnormal} není normálních` : ""}</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-[var(--vv-line)]">
                    <table className="w-full min-w-[560px]">
                      <tbody>
                        {am.map((inf) => (
                          <InfluenceRow key={inf.id} inf={inf} value={space.values[inf.id] ?? ""} onChange={(v) => setValue(inf.id, v)} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          ))}

          <div className="mt-4">
            <label className="field-label" htmlFor={noteId}>
              Poznámka k prostoru (nepovinné)
            </label>
            <textarea
              id={noteId}
              className="input min-h-[70px]"
              maxLength={2000}
              value={space.note}
              onChange={(e) => onChange({ ...space, note: e.target.value })}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="vv-btn vv-btn-secondary text-sm" onClick={onDuplicate}>
              Duplikovat prostor
            </button>
            {canRemove && (
              <button type="button" className="vv-btn vv-btn-ghost text-sm text-bad" onClick={onRemove}>
                Odebrat prostor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
