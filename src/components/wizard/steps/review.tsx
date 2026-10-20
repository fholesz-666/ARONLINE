"use client";

import { Notice, OriginBadge } from "../../ui";
import { STEPS, stepForPath, type StepProps } from "../wizard";

const PATH_LABELS: [RegExp, string][] = [
  [/^calc\.structure\.L$/, "Délka objektu L"],
  [/^calc\.structure\.W$/, "Šířka objektu W"],
  [/^calc\.structure\.H$/, "Výška objektu H"],
  [/^calc\.structure\.prominentHeight$/, "Výška vyčnívající části Hp"],
  [/^calc\.structure\.cd$/, "Součinitel polohy CD"],
  [/^calc\.structure\.lps$/, "Třída LPS"],
  [/^calc\.structure\.totalPersons$/, "Celkový počet osob nt"],
  [/^calc\.lossTypes$/, "Hodnocené druhy ztrát"],
  [/^calc\.options$/, "Doplňující volby ztrát"],
  [/^calc\.lightning$/, "Hustota výbojů NG / Td"],
  [/^calc\.lines\.[^.]+\.peb$/, "SPD na vstupu vedení"],
  [/^calc\.lines\./, "Údaje o vedení"],
  [/^calc\.zones\.[^.]+\.systems$/, "Vnitřní systémy zóny"],
  [/^calc\.zones\[\d+\]\.protection$/, "Ochranná opatření zóny"],
  [/^calc\.zones\[\d+\]$/, "Parametry zóny (předvolba podle druhu objektu)"],
];

function labelFor(path: string, lineNames: Map<string, string>) {
  const hit = PATH_LABELS.find(([re]) => re.test(path));
  const lineId = path.match(/^calc\.lines\.([^.]+)/)?.[1];
  const base = hit ? hit[1] : path.replace(/^calc\./, "");
  return lineId && lineNames.get(lineId) ? `${base} – ${lineNames.get(lineId)}` : base;
}

export function StepReview({ data, update, issues, go }: StepProps) {
  const lineNames = new Map(((data.calc.lines as { id: string; name: string }[] | undefined) ?? []).map((l) => [l.id, l.name]));
  const prov = Object.entries(data.provenance).filter(([, m]) => m.origin !== "manual" || m.quality === "estimated" || !m.confirmed);
  const unconfirmed = prov.filter(([, m]) => !m.confirmed);

  return (
    <div className="space-y-8">
      {issues.length > 0 ? (
        <Notice tone="error" title={`Chybí nebo jsou chybné údaje (${issues.length})`}>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {issues.slice(0, 30).map((i) => (
              <li key={i.path + i.message}>
                <button className="link" onClick={() => go(stepForPath(i.path))}>
                  {STEPS.find((s) => s.slug === stepForPath(i.path))?.title}
                </button>
                : {i.message} <span className="text-muted">({i.path})</span>
              </li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice tone="ok">Všechny údaje potřebné pro výpočet jsou vyplněné.</Notice>
      )}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg">Převzaté a předvyplněné údaje</h3>
          {unconfirmed.length > 0 && (
            <button
              className="btn btn-secondary px-3 py-1.5 text-sm"
              onClick={() =>
                update((d) => {
                  for (const [k] of unconfirmed) d.provenance[k] = { ...d.provenance[k], confirmed: true };
                })
              }
            >
              Potvrdit vše ({unconfirmed.length})
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Potvrzením stvrzujete, že jste hodnotu ověřili. Nepotvrzené údaje se v dokumentu vypíší v upozorněních.
        </p>
        {prov.length === 0 ? (
          <p className="mt-3 text-ink-soft">Všechny údaje jste zadali ručně.</p>
        ) : (
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-3 py-2">Údaj</th>
                  <th className="px-3 py-2">Původ</th>
                  <th className="px-3 py-2">Zdroj</th>
                  <th className="px-3 py-2">Potvrzeno</th>
                </tr>
              </thead>
              <tbody>
                {prov.map(([k, m]) => (
                  <tr key={k} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-2">{labelFor(k, lineNames)}</td>
                    <td className="px-3 py-2">
                      <OriginBadge origin={m.origin} confirmed={m.confirmed} source={m.source} />
                    </td>
                    <td className="px-3 py-2 text-ink-soft">
                      {m.source}
                      {m.quality === "estimated" ? " (odhad)" : ""}
                      {m.retrievedAt ? `, ${new Date(m.retrievedAt).toLocaleDateString("cs-CZ")}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        aria-label={`Potvrdit ${labelFor(k, lineNames)}`}
                        checked={m.confirmed}
                        onChange={(e) => update((d) => (d.provenance[k] = { ...d.provenance[k], confirmed: e.target.checked }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {issues.length === 0 && (
        <button className="btn btn-primary" onClick={() => go("vysledky")}>
          Spočítat riziko
        </button>
      )}
    </div>
  );
}
