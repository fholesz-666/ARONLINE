"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fmtRisk } from "@/core/util/format";
import { api, ApiError } from "@/lib/api";
import type { ResultView } from "@/server/services/preview";
import { startPayment } from "../../billing";
import { Notice, Spinner } from "../../ui";
import { STEPS, stepForPath, type StepProps } from "../wizard";

const LOSS: Record<string, string> = {
  L1: "R1 – ztráta lidského života",
  L2: "R2 – ztráta veřejné služby",
  L3: "R3 – ztráta kulturního dědictví",
  L4: "R4 – ztráta ekonomické hodnoty",
};
const COMP: Record<string, string> = {
  RA: "úraz – úder do objektu",
  RB: "hmotná škoda – úder do objektu",
  RC: "porucha systémů – úder do objektu",
  RM: "porucha systémů – úder v blízkosti objektu",
  RU: "úraz – úder do vedení",
  RV: "hmotná škoda – úder do vedení",
  RW: "porucha systémů – úder do vedení",
  RZ: "porucha systémů – úder v blízkosti vedení",
};

interface Billing {
  balance: number;
  subscription: { unlocksUsed: number; unlocksPerPeriod: number | null; productName: string } | null;
  payments: { available: boolean; reason?: string };
  products: { code: string; priceHaler: number }[];
}

type RiskRow = { loss: string; total: number; tolerable: number; exceeds: boolean; dominant: { component: string; share: number }[] };

export function StepResults({ project, issues, go, saveNow, onUnlocked }: StepProps & { saveNow: () => Promise<void>; onUnlocked: () => void }) {
  const [view, setView] = useState<ResultView | null>(null);
  const [runInfo, setRunInfo] = useState<{ id: string; createdAt: string } | null>(null);
  const [calcIssues, setCalcIssues] = useState<{ path: string; message: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [unlocked, setUnlocked] = useState(project.unlocked);

  const run = useCallback(async () => {
    setBusy("Počítám…");
    setError(null);
    setCalcIssues([]);
    try {
      await saveNow();
      const r = await api<{ ok: boolean; runId: string; createdAt: string; view: ResultView }>(`/api/projects/${project.id}/calculate`, { body: {} });
      setView(r.view);
      setRunInfo({ id: r.runId, createdAt: r.createdAt });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setCalcIssues(Array.isArray(e.details) ? (e.details as { path: string; message: string }[]) : []);
        setError("Výpočet nelze provést – doplňte chybějící údaje.");
      } else setError(e instanceof ApiError ? e.message : "Výpočet se nezdařil.");
    } finally {
      setBusy(null);
    }
  }, [project.id, saveNow]);

  useEffect(() => {
    if (issues.length === 0) run();
    api<Billing>("/api/billing").then(setBilling).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (issues.length > 0) {
    return (
      <Notice tone="error" title="Výpočet zatím nelze provést">
        Chybí nebo jsou chybné údaje ({issues.length}).{" "}
        <button className="link" onClick={() => go("kontrola")}>
          Přejít na kontrolu údajů
        </button>
        {issues[0] && (
          <>
            {" "}
            – první: {STEPS.find((s) => s.slug === stepForPath(issues[0].path))?.title}: {issues[0].message}
          </>
        )}
      </Notice>
    );
  }

  const d = view?.designed as { risks: Record<string, RiskRow>; messages: { severity: string; message: string }[] } | undefined;
  const u = view?.unprotected as { risks: Record<string, RiskRow> } | undefined;
  const losses = d ? Object.keys(d.risks) : [];
  const failing = losses.filter((l) => d!.risks[l].exceeds);
  const canUnlockFree = billing && (billing.balance > 0 || (billing.subscription && (billing.subscription.unlocksPerPeriod == null || billing.subscription.unlocksUsed < billing.subscription.unlocksPerPeriod)));
  const single = billing?.products.find((p) => p.code === "SINGLE");

  return (
    <div className="space-y-8">
      {busy && <Spinner label={busy} />}
      {error && <Notice tone="error">{error}</Notice>}
      {calcIssues.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {calcIssues.map((i) => (
            <li key={i.path + i.message}>
              {i.message} ({i.path})
            </li>
          ))}
        </ul>
      )}

      {view && d && u && (
        <>
          {!view.verification.fullyVerified && (
            <Notice tone="warning" title="Neověřený výpočet">
              Výpočetní jádro zatím neprošlo nezávislým odborným ověřením (ověřeno {view.verification.verified} z {view.verification.total} položek). Výsledek ani dokument
              nelze považovat za normově ověřené.{" "}
              <Link href="/metodika" className="link">
                Stav ověření
              </Link>
            </Notice>
          )}
          <div className="panel overflow-x-auto">
            <table className="table-tech">
              <thead>
                <tr>
                  <th>Riziko</th>
                  <th className="num">Bez ochranných opatření</th>
                  <th className="num">Navržený stav</th>
                  <th className="num">Přípustné RT</th>
                  <th>Vyhodnocení</th>
                </tr>
              </thead>
              <tbody>
                {losses.map((l) => {
                  const r = d.risks[l];
                  return (
                    <tr key={l} className={r.exceeds ? "bg-bad-soft" : "bg-ok-soft"}>
                      <td>{LOSS[l]}</td>
                      <td className="num">{fmtRisk(u.risks[l].total)}</td>
                      <td className="num font-semibold">{fmtRisk(r.total)}</td>
                      <td className="num">{fmtRisk(r.tolerable)}</td>
                      <td className="font-semibold">{r.exceeds ? "R > RT – nevyhovuje" : "R ≤ RT – vyhovuje"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {failing.length === 0 ? (
            <Notice tone="ok" title="Navržená opatření jsou dostatečná">
              Pro všechny hodnocené ztráty je riziko v navrženém stavu menší nebo rovno přípustnému riziku.
            </Notice>
          ) : (
            <Notice tone="error" title="Riziko překračuje přípustnou hodnotu">
              {failing.map((l) => (
                <p key={l}>
                  {LOSS[l]}: největší podíl mají {d.risks[l].dominant.filter((x) => x.share >= 0.05).slice(0, 3).map((x) => `${x.component} – ${COMP[x.component]} (${Math.round(x.share * 100)} %)`).join(", ")}.
                </p>
              ))}
              <p className="mt-1">
                Upravte{" "}
                <button className="link" onClick={() => go("opatreni")}>
                  ochranná opatření
                </button>{" "}
                a výpočet zopakujte.
              </p>
            </Notice>
          )}

          {d.messages.filter((m) => m.severity === "warning").length > 0 && (
            <Notice tone="warning" title="Upozornění k výpočtu">
              <ul className="list-disc pl-5">
                {d.messages
                  .filter((m) => m.severity === "warning")
                  .map((m) => (
                    <li key={m.message}>{m.message}</li>
                  ))}
              </ul>
            </Notice>
          )}

          {view.level === "summary" && (
            <p className="text-sm text-muted">Podrobný rozpis složek rizika po zónách a úplná stopa výpočtu jsou součástí dokumentace.</p>
          )}

          <section className="panel space-y-3 p-5">
            <h3 className="text-lg">Dokumentace</h3>
            {unlocked ? (
              <>
                <p className="text-sm text-ink-soft">Dokumenty se vygenerují z posledního uloženého výpočtu{runInfo ? ` (${new Date(runInfo.createdAt).toLocaleString("cs-CZ")})` : ""}.</p>
                <div className="flex flex-wrap gap-2">
                  <a className="btn btn-primary" href={`/api/projects/${project.id}/export?format=pdf`}>
                    Stáhnout PDF
                  </a>
                  <a className="btn btn-secondary" href={`/api/projects/${project.id}/export?format=docx`}>
                    Stáhnout DOCX (Word)
                  </a>
                </div>
              </>
            ) : billing && !billing.payments.available ? (
              <Notice tone="warning">{billing.payments.reason}</Notice>
            ) : canUnlockFree ? (
              <>
                <p className="text-sm">
                  {billing!.subscription ? `Odemčení proběhne v rámci předplatného ${billing!.subscription.productName}.` : `Odemčení spotřebuje 1 kredit (zůstatek ${billing!.balance}).`} Po odemčení už
                  nelze měnit adresu a polohu objektu.
                </p>
                <button
                  className="btn btn-primary"
                  disabled={busy != null}
                  onClick={async () => {
                    setBusy("Odemykám…");
                    try {
                      await api(`/api/projects/${project.id}/unlock`, { body: {} });
                      setUnlocked(true);
                      onUnlocked();
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : "Odemčení se nezdařilo.");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Odemknout dokumentaci
                </button>
              </>
            ) : (
              <>
                <p className="text-sm">Pro stažení PDF a DOCX zaplaťte analýzu, nebo použijte balíček či předplatné.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    disabled={busy != null || !single}
                    onClick={async () => {
                      setBusy("Přesměrovávám na platební bránu…");
                      try {
                        await saveNow();
                        await startPayment("SINGLE", project.id);
                      } catch (e) {
                        setError(e instanceof ApiError ? e.message : "Platbu se nepodařilo zahájit.");
                        setBusy(null);
                      }
                    }}
                  >
                    Zaplatit analýzu{single ? ` (${(single.priceHaler / 100).toLocaleString("cs-CZ")} Kč)` : ""}
                  </button>
                  <Link className="btn btn-secondary" href="/app/predplatne">
                    Balíčky a předplatné
                  </Link>
                </div>
              </>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={run} disabled={busy != null}>
              Přepočítat
            </button>
          </div>
        </>
      )}
    </div>
  );
}
