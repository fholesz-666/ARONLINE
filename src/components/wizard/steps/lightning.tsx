"use client";

import { useEffect, useMemo, useRef } from "react";
import { TD_GRID } from "@/data/td-cz-grid";
import { tdAt } from "@/domain/td-map";
import { Field, Notice, NumberInput, TextInput } from "../../ui";
import { calcOf, manual, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

type TdMethod = "annex_a" | "csn_332000_4_443";

const CLASS_COLORS = ["transparent", "#f4f7fa", "#cfdfe9", "#5bb8e4", "#0590ce", "#105a88"];
const LEGEND = [
  { c: 1, t: "15–20" },
  { c: 2, t: "20–25" },
  { c: 3, t: "25–30" },
  { c: 4, t: "30–35" },
  { c: 5, t: "35–40" },
];

function ngFrom(td: number, m: TdMethod) {
  return m === "csn_332000_4_443" ? 0.04 * Math.pow(td, 1.25) : 0.1 * td;
}

/** Mapa bouřkových dnů ČR s polohou objektu; kliknutím lze vybrat jiné místo. */
function TdMap({ location, onPick }: { location: { lon: number; lat: number } | null; onPick: (lon: number, lat: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const SCALE = 4;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    TD_GRID.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = Number(row[i]);
        if (!c) continue;
        ctx.fillStyle = CLASS_COLORS[c];
        ctx.fillRect(i * SCALE, j * SCALE, SCALE, SCALE);
      }
    });
    if (location) {
      const x = ((location.lon - TD_GRID.lon0) / TD_GRID.dlon) * SCALE;
      const y = ((TD_GRID.lat1 - location.lat) / TD_GRID.dlat) * SCALE;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#d4351c";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
  }, [location]);
  return (
    <div>
      <canvas
        ref={ref}
        width={TD_GRID.nx * SCALE}
        height={TD_GRID.ny * SCALE}
        className="h-auto w-full max-w-[684px] cursor-crosshair rounded-md border border-line bg-sheet"
        aria-label="Mapa počtu bouřkových dnů v ČR"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * TD_GRID.nx;
          const py = ((e.clientY - r.top) / r.height) * TD_GRID.ny;
          onPick(TD_GRID.lon0 + px * TD_GRID.dlon, TD_GRID.lat1 - py * TD_GRID.dlat);
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Td (bouřkové dny/rok):</span>
        {LEGEND.map((l) => (
          <span key={l.c} className="flex items-center gap-1">
            <span className="inline-block h-3 w-5 border border-line" style={{ background: CLASS_COLORS[l.c] }} />
            {l.t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StepLightning({ data, update, issues }: StepProps) {
  const calc = calcOf(data);
  const l = calc.lightning ?? { mode: "td" as const, ng: null, td: null, source: "" };
  const method: TdMethod = (l as { tdMethod?: TdMethod }).tdMethod ?? "annex_a";
  const location = data.site.location ?? null;
  const fromMap = useMemo(() => (location ? tdAt(location.lon, location.lat) : null), [location]);

  const set = (patch: Partial<typeof l> & { tdMethod?: TdMethod }, auto = false) =>
    update((d) => {
      const c = calcOf(d);
      c.lightning = { ...(c.lightning ?? { mode: "td", ng: null, td: null, source: "" }), ...patch };
      setProvenance(
        d,
        "calc.lightning",
        auto ? { origin: "auto", source: fromMap?.source ?? "mapa bouřkových dnů", confirmed: false } : manual(),
      );
    });

  const applyMap = (r: NonNullable<ReturnType<typeof tdAt>>, auto: boolean) =>
    set(
      {
        mode: "td",
        td: r.suggested,
        source: `Izokeraunická mapa ČR (ČHMÚ – Atlas podnebí Česka, 2007): třída ${r.min}–${r.max} bouřkových dnů/rok, použita horní mez`,
      },
      auto,
    );

  // Automatické předvyplnění z mapy, pokud uživatel zatím nic nezadal.
  useEffect(() => {
    if (fromMap && l.td == null && l.ng == null && !l.source) applyMap(fromMap, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMap]);

  return (
    <div className="max-w-3xl space-y-5">
      <Notice tone="info">
        Počet bouřkových dnů Td se předvyplní podle polohy objektu z izokeraunické mapy ČR (ČHMÚ). Mapa je orientační – použije se horní mez
        třídy (na straně bezpečnosti). Hodnotu můžete změnit nebo kliknout do mapy na jiné místo. Máte-li měřenou hustotu výbojů NG, zadejte ji
        přímo.
      </Notice>

      <TdMap location={location} onPick={(lon, lat) => {
        const r = tdAt(lon, lat);
        if (r) applyMap(r, false);
      }} />

      {fromMap ? (
        <p className="text-sm">
          Poloha objektu: třída <strong>{fromMap.min}–{fromMap.max}</strong> bouřkových dnů/rok
          {fromMap.nearBoundary && " – objekt leží blízko hranice s vyšší třídou, zvažte vyšší hodnotu"}.{" "}
          {l.td !== fromMap.suggested && (
            <button className="link" onClick={() => applyMap(fromMap, false)}>
              Použít Td = {fromMap.suggested}
            </button>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted">Poloha objektu zatím není zadána (krok Objekt) – Td zadejte ručně nebo klikněte do mapy.</p>
      )}

      <Field label="Způsob zadání">
        <div className="flex flex-wrap gap-4 text-[0.9375rem]">
          <label className="flex items-center gap-2">
            <input type="radio" name="ngmode" checked={l.mode === "td"} onChange={() => set({ mode: "td" })} /> Počet bouřkových dnů Td
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="ngmode" checked={l.mode === "ng"} onChange={() => set({ mode: "ng" })} /> Hustota výbojů NG (měřená)
          </label>
        </div>
      </Field>
      {l.mode === "ng" ? (
        <NumberInput label="NG – hustota výbojů do země" unit="1/(km²·rok)" value={l.ng} onChange={(v) => set({ ng: v })} error={issueFor(issues, "lightning.ng")} />
      ) : (
        <>
          <NumberInput
            label="Td – počet bouřkových dnů"
            unit="dny/rok"
            value={l.td}
            onChange={(v) => set({ td: v })}
            error={issueFor(issues, "lightning.td")}
            help={l.td ? `NG = ${ngFrom(l.td, method).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} 1/(km²·rok)` : undefined}
          />
          <Field label="Přepočet Td → NG">
            <div className="space-y-1.5 text-[0.9375rem]">
              <label className="flex items-start gap-2">
                <input type="radio" name="tdmethod" checked={method === "annex_a"} onChange={() => set({ tdMethod: "annex_a" })} />
                <span>
                  NG ≈ 0,1 · Td – ČSN EN 62305-2 ed. 2, příloha A
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="tdmethod" checked={method === "csn_332000_4_443"} onChange={() => set({ tdMethod: "csn_332000_4_443" })} />
                <span>NG = 0,04 · Td^1,25 – ČSN 33 2000-4-443 ed. 2 (stejně jako program Prozik)</span>
              </label>
            </div>
          </Field>
        </>
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
