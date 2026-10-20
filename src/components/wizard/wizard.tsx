"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { zEd2Input } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import { Notice, Spinner } from "../ui";
import { StepIdentification } from "./steps/identification";
import { StepLightning } from "./steps/lightning";
import { StepLines } from "./steps/lines";
import { StepObject } from "./steps/object";
import { StepProtection } from "./steps/protection";
import { StepResults } from "./steps/results";
import { StepReview } from "./steps/review";
import { StepSurroundings } from "./steps/surroundings";
import { StepZones } from "./steps/zones";
import { useProject, type SaveState } from "./use-project";

export const STEPS = [
  { slug: "identifikace", title: "Identifikace a razítko" },
  { slug: "objekt", title: "Objekt" },
  { slug: "okoli", title: "Okolí" },
  { slug: "blesky", title: "Bouřková činnost" },
  { slug: "vedeni", title: "Přívodní vedení" },
  { slug: "zony", title: "Zóny a ztráty" },
  { slug: "opatreni", title: "Ochranná opatření" },
  { slug: "kontrola", title: "Kontrola údajů" },
  { slug: "vysledky", title: "Výsledek a dokumentace" },
] as const;
export type StepSlug = (typeof STEPS)[number]["slug"];

/** Přiřazení chyby validace ke kroku průvodce podle cesty ve vstupu. */
export function stepForPath(path: string): StepSlug {
  if (path.startsWith("lightning")) return "blesky";
  if (path.startsWith("lines")) return "vedeni";
  if (path === "structure.cd") return "okoli";
  if (path === "structure.lps") return "opatreni";
  if (path.startsWith("structure.totalPersons") || path.startsWith("structure.totalServedUsers")) return "zony";
  if (path.startsWith("structure")) return "objekt";
  if (/^zones\[\d+\]\.(pta|ptu|fireProvisions|shieldExternal|shieldInternal)/.test(path) || /internalSystems\[\d+\]\.pspd/.test(path)) return "opatreni";
  return "zony";
}

function SaveIndicator({ state, error, onReload }: { state: SaveState; error: string | null; onReload: () => void }) {
  if (state === "conflict")
    return (
      <span className="text-sm text-bad">
        Konflikt verzí.{" "}
        <button className="link" onClick={onReload}>
          Načíst aktuální
        </button>
      </span>
    );
  if (state === "error") return <span className="text-sm text-bad">{error ?? "Neuloženo"}</span>;
  const text = { idle: "Uloženo", saved: "Uloženo", dirty: "Neuložené změny…", saving: "Ukládám…" }[state];
  return <span className={`text-sm ${state === "dirty" || state === "saving" ? "text-muted" : "text-ok"}`}>{text}</span>;
}

export function ProjectWizard({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const slug = (STEPS.find((s) => s.slug === sp.get("krok"))?.slug ?? "identifikace") as StepSlug;
  const p = useProject(id);
  const { data, project } = p;

  const issues = useMemo(() => {
    if (!data) return [];
    const r = zEd2Input.safeParse(data.calc);
    return r.success ? [] : r.error.issues.map((i) => ({ path: i.path.map((x) => (typeof x === "number" ? `[${x}]` : x)).join(".").replace(/\.\[/g, "["), message: i.message }));
  }, [data]);
  const issuesByStep = useMemo(() => {
    const m = new Map<StepSlug, number>();
    for (const i of issues) m.set(stepForPath(i.path), (m.get(stepForPath(i.path)) ?? 0) + 1);
    return m;
  }, [issues]);
  const unconfirmed = data ? Object.values(data.provenance).filter((m) => !m.confirmed).length : 0;

  if (p.loadError) return <div className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error">{p.loadError}</Notice></div>;
  if (!data || !project) return <div className="mx-auto max-w-3xl px-4 py-10"><Spinner label="Načítám projekt…" /></div>;

  const idx = STEPS.findIndex((s) => s.slug === slug);
  const go = (s: StepSlug) => {
    router.replace(`/app/projekty/${id}?krok=${s}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };
  const stepProps = { data, update: p.update, project, issues, go };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <Link href="/app" className="link text-sm">
            Analýzy
          </Link>
          <h1 className="mt-1 text-2xl">{data.identification.projectName || project.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={p.saveState} error={p.saveError} onReload={p.reload} />
          <Link href={`/app/projekty/${id}/historie`} className="btn btn-ghost px-2.5 py-1.5 text-sm">
            Historie
          </Link>
        </div>
      </div>
      {project.objectLockedAt && (
        <div className="mt-4">
          <Notice tone="info">Analýza je odemčená. Výpočet můžete upravovat a dokumentaci stahovat znovu, adresu a polohu objektu už nelze změnit.</Notice>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Kroky analýzy" className="lg:sticky lg:top-4 lg:self-start">
          <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {STEPS.map((s, i) => {
              const n = issuesByStep.get(s.slug) ?? 0;
              const active = s.slug === slug;
              return (
                <li key={s.slug} className="shrink-0">
                  <button
                    onClick={() => go(s.slug)}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm ${active ? "bg-ink text-white" : "text-ink hover:bg-line-soft"}`}
                  >
                    <span
                      className={`type-wide flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-bold ${active ? "border-signal bg-signal text-ink" : "border-line bg-sheet"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{s.title}</span>
                    {n > 0 && s.slug !== "kontrola" && s.slug !== "vysledky" && (
                      <span className={`ml-auto rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-bad-soft text-bad"}`} title={`${n} chybějících nebo chybných údajů`}>
                        {n}
                      </span>
                    )}
                    {s.slug === "kontrola" && unconfirmed > 0 && (
                      <span className={`ml-auto rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-signal-soft text-preset"}`} title="Nepotvrzené údaje">
                        {unconfirmed}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="step-title">
          <h2 id="step-title" className="text-xl">
            {STEPS[idx].title}
          </h2>
          <div className="mt-5">
            {slug === "identifikace" && <StepIdentification {...stepProps} />}
            {slug === "objekt" && <StepObject {...stepProps} />}
            {slug === "okoli" && <StepSurroundings {...stepProps} />}
            {slug === "blesky" && <StepLightning {...stepProps} />}
            {slug === "vedeni" && <StepLines {...stepProps} />}
            {slug === "zony" && <StepZones {...stepProps} />}
            {slug === "opatreni" && <StepProtection {...stepProps} />}
            {slug === "kontrola" && <StepReview {...stepProps} />}
            {slug === "vysledky" && <StepResults {...stepProps} saveNow={p.saveNow} onUnlocked={() => p.reload()} />}
          </div>
          <div className="mt-8 flex justify-between border-t border-line pt-4">
            {idx > 0 ? (
              <button className="btn btn-secondary" onClick={() => go(STEPS[idx - 1].slug)}>
                Zpět
              </button>
            ) : (
              <span />
            )}
            {idx < STEPS.length - 1 && (
              <button className="btn btn-primary" onClick={() => go(STEPS[idx + 1].slug)}>
                Pokračovat: {STEPS[idx + 1].title}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export type StepProps = {
  data: NonNullable<ReturnType<typeof useProject>["data"]>;
  update: ReturnType<typeof useProject>["update"];
  project: NonNullable<ReturnType<typeof useProject>["project"]>;
  issues: { path: string; message: string }[];
  go: (s: StepSlug) => void;
};

export function issueFor(issues: StepProps["issues"], path: string): string | null {
  return issues.find((i) => i.path === path)?.message ?? null;
}
