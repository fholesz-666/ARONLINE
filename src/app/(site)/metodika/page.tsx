import type { Metadata } from "next";
import { getVerificationSummary, listVerificationItems, NORMATIVE_DATA_HASH } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";
import { CORE_VERSION } from "@/core/risk";
import { METHODOLOGIES } from "@/core/risk/registry";

export const metadata: Metadata = { title: "Metodika a stav ověření" };

const STATUS: Record<string, string> = { unverified: "Neověřeno", verified: "Ověřeno", rejected: "Zamítnuto – k opravě" };

export default function MethodologyPage() {
  const items = listVerificationItems();
  const s = getVerificationSummary();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl">Metodika a stav ověření výpočtu</h1>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {Object.values(METHODOLOGIES).map((m) => (
          <div key={m.id} className="panel p-5">
            <h2 className="text-lg">{m.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{m.norm}</p>
            <p className="mt-3 text-sm">
              Stav:{" "}
              <strong className={m.status === "implemented" ? "text-ok" : "text-bad"}>
                {m.status === "implemented" ? "implementováno" : "neimplementováno"}
              </strong>
              {m.effectiveFrom && <> · účinnost od {new Date(m.effectiveFrom).toLocaleDateString("cs-CZ")}</>}
              {m.usableUntil && <> · použitelné do {new Date(m.usableUntil).toLocaleDateString("cs-CZ")}</>}
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              {m.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Ověření normových tabulek a vzorců</h2>
        <p className="mt-2 max-w-[75ch] text-ink-soft">
          Hodnoty součinitelů a pravděpodobností pocházejí z placené normy. Do aplikace je přepsal implementátor a u každé tabulky je uveden veřejný zdroj, se kterým se
          hodnoty shodují (pokud existuje). Dokud všechny položky nepotvrdí nezávislý odborník s legálně pořízeným textem normy, dokumenty nesou označení
          „Neověřený výpočet“ a placené exporty jsou v produkčním provozu vypnuté.
        </p>
        <p className="mt-3 text-sm">
          Ověřeno <strong>{s.verified}</strong> z {s.total} · verze jádra {CORE_VERSION} · otisk normativních dat <code>{NORMATIVE_DATA_HASH}</code>
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="table-tech bg-sheet">
            <thead>
              <tr>
                <th>Položka</th>
                <th>Odkaz do normy</th>
                <th>Veřejný zdroj</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="font-semibold">{i.symbol}</span> – {i.kind === "table" ? i.title : <span className="text-ink-soft">{i.title}</span>}
                  </td>
                  <td className="whitespace-nowrap">{i.normRef}</td>
                  <td>
                    {i.publicSources.length
                      ? i.publicSources.map((p) => (
                          <a key={p.title} href={p.url} className="link block" rel="noopener">
                            {p.title}
                            {p.locator ? `, ${p.locator}` : ""}
                          </a>
                        ))
                      : "–"}
                  </td>
                  <td className={i.verification.status === "verified" ? "text-ok" : "text-bad"}>{STATUS[i.verification.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
