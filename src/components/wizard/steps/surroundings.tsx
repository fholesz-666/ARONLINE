"use client";

import { suggestCd } from "@/domain/cd";
import * as T from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { Notice, OriginBadge, SelectInput } from "../../ui";
import { CD_OPTIONS } from "../options";
import { calcOf, manual, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

export function StepSurroundings({ data, update, issues }: StepProps) {
  const calc = calcOf(data);
  const H = calc.structure?.H;
  const neighbours = data.site.neighbours;
  const suggestion = typeof H === "number" && H > 0 ? suggestCd(H, neighbours.map((n) => ({ distance: n.distance, height: n.heightManual ?? n.heightEstimate ?? null, include: n.include }))) : null;
  const cd = calc.structure?.cd;
  const cdMeta = data.provenance["calc.structure.cd"];

  const setCd = (key: T.CdKey, origin: "manual" | "auto") =>
    update((d) => {
      const c = calcOf(d);
      c.structure ??= {};
      c.structure.cd = key;
      setProvenance(
        d,
        "calc.structure.cd",
        origin === "manual" ? manual() : { origin: "auto", source: `Návrh z okolních budov: ${suggestion?.reason ?? ""}`, confirmed: false, retrievedAt: new Date().toISOString() },
      );
    });

  return (
    <div className="space-y-6">
      {!data.site.location && <Notice tone="info">Okolní budovy se načtou po výběru objektu v kroku Objekt. Součinitel polohy můžete zvolit i ručně.</Notice>}
      {neighbours.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-3 py-2">Zahrnout</th>
                <th className="px-3 py-2 text-right">Vzdálenost od objektu</th>
                <th className="px-3 py-2 text-right">Odhad výšky (ČÚZK)</th>
                <th className="px-3 py-2">Výška ručně</th>
                <th className="px-3 py-2">V okruhu 3H</th>
              </tr>
            </thead>
            <tbody>
              {neighbours.map((n, i) => {
                const within = typeof H === "number" && n.distance <= 3 * H;
                return (
                  <tr key={n.id} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        aria-label={`Zahrnout budovu ve vzdálenosti ${n.distance} m`}
                        checked={n.include}
                        onChange={(e) => update((d) => (d.site.neighbours[i].include = e.target.checked))}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">{n.distance.toLocaleString("cs-CZ")} m</td>
                    <td className="px-3 py-1.5 text-right">{n.heightEstimate != null ? `${n.heightEstimate.toLocaleString("cs-CZ")} m` : "–"}</td>
                    <td className="px-3 py-1.5">
                      <input
                        className="input w-24 py-1"
                        inputMode="decimal"
                        aria-label="Výška budovy ručně v metrech"
                        defaultValue={n.heightManual != null ? String(n.heightManual).replace(".", ",") : ""}
                        onBlur={(e) => {
                          const t = e.target.value.trim().replace(",", ".");
                          const v = t === "" ? null : Number(t);
                          if (v === null || (Number.isFinite(v) && v >= 0 && v < 500)) update((d) => (d.site.neighbours[i].heightManual = v));
                        }}
                      />
                    </td>
                    <td className="px-3 py-1.5">{within ? "ano" : "ne"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {neighbours.length > 0 && <p className="text-xs text-muted">Vzdálenost se měří mezi obrysy budov. Výšky jsou orientační odhady z výškopisu – u rozhodujících budov je ověřte.</p>}

      {suggestion && (
        <Notice tone="info" title="Návrh součinitele polohy CD">
          {T.TABLE_CD.rows[suggestion.key].label}. {suggestion.reason}{" "}
          {cd !== suggestion.key && (
            <button className="link font-semibold" onClick={() => setCd(suggestion.key, "auto")}>
              Použít návrh
            </button>
          )}
          <span className="mt-1 block text-ink-soft">Objekt na vrcholu kopce nebo pahorku (CD = 2) aplikace z dat nepozná – posuďte sami.</span>
        </Notice>
      )}

      <SelectInput
        label="Součinitel polohy objektu CD"
        value={cd ?? null}
        onChange={(v) => setCd(v, "manual")}
        options={CD_OPTIONS}
        error={issueFor(issues, "structure.cd")}
        badge={cdMeta ? <OriginBadge origin={cdMeta.origin} confirmed={cdMeta.confirmed} source={cdMeta.source} /> : null}
        help="Ovlivňuje počet přímých úderů do objektu ND (ČSN EN 62305-2 ed. 2, tab. A.1)."
      />
    </div>
  );
}
