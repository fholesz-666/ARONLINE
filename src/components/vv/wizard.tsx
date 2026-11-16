"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BASIS } from "@/core/vv/catalog";
import { evaluateSpace } from "@/core/vv/evaluate";
import { presetValues } from "@/core/vv/presets";
import type { VvPerson, VvProtocolData, VvSpace } from "@/core/vv/schema";
import { ApiError } from "@/lib/api";
import { DRAFT_KEY, getToken, newId, saveToken, storeGet, storeRemove, storeSet, vvApi } from "./client";
import { VvPromoStrip } from "./chrome";
import { SpaceEditor } from "./space-editor";

interface FormState {
  object: VvProtocolData["object"];
  basisText: string;
  chair: VvPerson;
  members: VvPerson[];
  spaces: VvSpace[];
  notes: string;
  confirmations: boolean[];
  email: string;
  marketing: boolean;
  terms: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

function emptyState(): FormState {
  return {
    object: { name: "", address: "", description: "", investor: "", number: "", date: today(), place: "" },
    basisText: DEFAULT_BASIS.join("\n"),
    chair: { name: "", role: "" },
    members: [{ name: "", role: "" }],
    spaces: [{ id: newId(), name: "", preset: "normal", note: "", values: presetValues("normal") }],
    notes: "",
    confirmations: [],
    email: "",
    marketing: false,
    terms: false,
  };
}

function fromProtocol(d: VvProtocolData): FormState {
  return {
    ...emptyState(),
    object: { ...emptyState().object, ...d.object },
    basisText: d.basis.join("\n"),
    chair: d.committee.chair,
    members: d.committee.members,
    spaces: d.spaces.map((s) => ({ ...s, values: { ...presetValues(undefined), ...s.values } })),
    notes: d.notes,
  };
}

function toData(f: FormState): VvProtocolData {
  return {
    version: 1,
    object: f.object,
    basis: f.basisText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    committee: { chair: f.chair, members: f.members },
    spaces: f.spaces,
    notes: f.notes,
  };
}

const STEPS = ["Objekt", "Komise", "Prostory", "Potvrzení"] as const;

function validateStep(step: number, f: FormState): string[] {
  const e: string[] = [];
  if (step === 0) {
    if (!f.object.name.trim()) e.push("Zadejte název objektu.");
    if (!f.object.address.trim()) e.push("Zadejte adresu nebo parcelu.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.object.date)) e.push("Zadejte datum určení.");
  }
  if (step === 1) {
    if (!f.chair.name.trim()) e.push("Zadejte jméno předsedy komise.");
    if (!f.members.length) e.push("Komise musí mít alespoň jednoho dalšího člena.");
    f.members.forEach((m, i) => {
      if (!m.name.trim()) e.push(`Zadejte jméno ${i + 1}. člena komise.`);
    });
  }
  if (step === 2) {
    if (!f.spaces.length) e.push("Přidejte alespoň jeden prostor.");
    f.spaces.forEach((s, i) => {
      if (!s.name.trim()) e.push(`Zadejte název ${i + 1}. prostoru.`);
      if (evaluateSpace(s.values).missing.length) e.push(`U prostoru ${i + 1} chybí hodnoty některých vlivů.`);
    });
  }
  return e;
}

function PersonFields({ person, onChange, label }: { person: VvPerson; onChange: (p: VvPerson) => void; label: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="field-label">
          {label} – jméno a příjmení
          <input className="input mt-1 font-normal" value={person.name} maxLength={120} onChange={(e) => onChange({ ...person, name: e.target.value })} />
        </label>
      </div>
      <div>
        <label className="field-label">
          Profese / kvalifikace
          <input
            className="input mt-1 font-normal"
            value={person.role}
            maxLength={160}
            placeholder="např. projektant, revizní technik, zástupce investora"
            onChange={(e) => onChange({ ...person, role: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

export function VvWizard({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(() => ({ ...emptyState(), email: defaultEmail }));
  const [step, setStep] = useState(0);
  const [openSpace, setOpenSpace] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ id: string; token: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // Načtení: úprava existujícího protokolu (?upravit=id), jinak rozpracovaný koncept
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("upravit");
    if (id) {
      // token z odkazu, případně přístup vlastníka přes přihlášení
      const token = getToken(id) ?? "";
      vvApi<{ protocol: { data: VvProtocolData } }>(`/api/vv/protocols/${encodeURIComponent(id)}`, token)
        .then((r) => {
          setF(fromProtocol(r.protocol.data));
          setEdit({ id, token });
        })
        .catch((e) => setErrors([e instanceof Error ? e.message : "Protokol se nepodařilo načíst."]))
        .finally(() => setLoaded(true));
      return;
    }
    const raw = storeGet(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<FormState>;
        setF((cur) => ({ ...cur, ...d, email: d.email || cur.email, confirmations: [], terms: false }));
      } catch {
        /* poškozený koncept */
      }
    }
    setLoaded(true);
  }, []);

  // Průběžné ukládání konceptu (jen nový protokol)
  useEffect(() => {
    if (!loaded || edit) return;
    const t = setTimeout(() => {
      const { confirmations: _c, terms: _t, ...rest } = f;
      void _c;
      void _t;
      storeSet(DRAFT_KEY, JSON.stringify(rest));
    }, 400);
    return () => clearTimeout(t);
  }, [f, loaded, edit]);

  const members = useMemo(() => [{ ...f.chair, chair: true }, ...f.members.map((m) => ({ ...m, chair: false }))], [f.chair, f.members]);
  const evaluations = useMemo(() => f.spaces.map((s) => evaluateSpace(s.values)), [f.spaces]);
  const hasAq3 = evaluations.some((e) => e.abnormal.some((r) => r.value === "AQ3"));

  const go = (to: number) => {
    if (to > step) {
      for (let s = step; s < to; s++) {
        const e = validateStep(s, f);
        if (e.length) {
          setErrors(e);
          setStep(s);
          top.current?.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
    }
    setErrors([]);
    setStep(to);
    top.current?.scrollIntoView({ behavior: "smooth" });
  };

  const setObject = (k: keyof FormState["object"], v: string) => setF((c) => ({ ...c, object: { ...c.object, [k]: v } }));
  const updateSpace = (i: number, s: VvSpace) => setF((c) => ({ ...c, spaces: c.spaces.map((x, j) => (j === i ? s : x)) }));

  const addSpace = () => {
    const s: VvSpace = { id: newId(), name: "", preset: "normal", note: "", values: presetValues("normal") };
    setF((c) => ({ ...c, spaces: [...c.spaces, s] }));
    setOpenSpace(s.id);
  };

  const submit = async () => {
    const all = [0, 1, 2].flatMap((s) => validateStep(s, f));
    if (members.some((_, i) => !f.confirmations[i])) all.push("Potvrzení musí zaškrtnout všichni členové komise.");
    if (!edit) {
      if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) all.push("Zadejte e-mail, na který pošleme odkaz na protokol.");
      if (!f.terms) all.push("Potvrďte souhlas s obchodními podmínkami.");
    }
    if (all.length) {
      setErrors(all);
      top.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBusy(true);
    setErrors([]);
    const confirmations = members.map((_, i) => f.confirmations[i] === true);
    try {
      if (edit) {
        await vvApi(`/api/vv/protocols/${encodeURIComponent(edit.id)}`, edit.token, { method: "PUT", body: { data: toData(f), confirmations } });
        router.push(`/vnejsi-vlivy/protokol/${edit.id}?upraveno=1`);
      } else {
        const r = await vvApi<{ id: string; token: string }>("/api/vv/protocols", null, {
          body: { data: toData(f), confirmations, email: f.email.trim(), marketingConsent: f.marketing, acceptTerms: true },
        });
        saveToken(r.id, r.token);
        storeRemove(DRAFT_KEY);
        router.push(`/vnejsi-vlivy/protokol/${r.id}?novy=1`);
      }
    } catch (e) {
      const details = e instanceof ApiError && Array.isArray(e.details) ? (e.details as { message: string }[]).map((d) => d.message) : [];
      setErrors([e instanceof Error ? e.message : "Protokol se nepodařilo uložit.", ...details]);
      top.current?.scrollIntoView({ behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  const resetDraft = () => {
    storeRemove(DRAFT_KEY);
    setF(emptyState());
    setStep(0);
    setErrors([]);
  };

  return (
    <div ref={top} className="mx-auto max-w-4xl scroll-mt-4 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{edit ? "Úprava protokolu" : "Nový protokol o určení vnějších vlivů"}</h1>
          <p className="mt-1 text-sm text-ink-soft">Podle ČSN 33 2000-5-51 ed. 3 + Z1 + Z2. Rozpracovaný protokol se průběžně ukládá v tomto prohlížeči.</p>
        </div>
        {!edit && loaded && (
          <button type="button" className="vv-btn vv-btn-ghost text-sm" onClick={resetDraft}>
            Začít znovu
          </button>
        )}
      </div>

      <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2" aria-label="Kroky formuláře">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            className="vv-step"
            aria-current={i === step ? "step" : undefined}
            data-done={i < step ? "true" : undefined}
            onClick={() => go(i)}
          >
            <span className="vv-step-num">{i < step ? "✓" : i + 1}</span>
            {s}
          </button>
        ))}
      </nav>

      {errors.length > 0 && (
        <div className="mt-5 rounded-xl border border-bad bg-bad-soft px-4 py-3 text-sm" role="alert">
          <ul className="list-disc space-y-0.5 pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {!loaded ? (
        <p className="mt-8 text-sm text-muted">Načítám…</p>
      ) : (
        <div className="mt-6">
          {step === 0 && (
            <div className="vv-card space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Objekt / stavba *
                  <input className="input mt-1 font-normal" value={f.object.name} maxLength={200} placeholder="např. Rodinný dům s FVE" onChange={(e) => setObject("name", e.target.value)} />
                </label>
                <label className="field-label">
                  Adresa nebo parcela *
                  <input className="input mt-1 font-normal" value={f.object.address} maxLength={300} placeholder="ulice, č. p., obec / parc. č., k. ú." onChange={(e) => setObject("address", e.target.value)} />
                </label>
                <label className="field-label">
                  Objednatel / investor
                  <input className="input mt-1 font-normal" value={f.object.investor} maxLength={200} onChange={(e) => setObject("investor", e.target.value)} />
                </label>
                <label className="field-label">
                  Evidenční číslo protokolu
                  <input className="input mt-1 font-normal" value={f.object.number} maxLength={60} placeholder="např. PVV 2026-014" onChange={(e) => setObject("number", e.target.value)} />
                </label>
                <label className="field-label">
                  Datum určení *
                  <input type="date" className="input mt-1 font-normal" value={f.object.date} onChange={(e) => setObject("date", e.target.value)} />
                </label>
                <label className="field-label">
                  Místo podpisu
                  <input className="input mt-1 font-normal" value={f.object.place} maxLength={120} placeholder="např. Praze" onChange={(e) => setObject("place", e.target.value)} />
                  <span className="field-help font-normal">V protokolu: „V {f.object.place || "…"} dne …“</span>
                </label>
              </div>
              <label className="field-label block">
                Popis objektu a účel protokolu
                <textarea
                  className="input mt-1 min-h-[80px] font-normal"
                  maxLength={2000}
                  value={f.object.description}
                  placeholder="např. Vnitřní a venkovní prostory rodinného domu pro účely instalace fotovoltaické elektrárny."
                  onChange={(e) => setObject("description", e.target.value)}
                />
              </label>
              <label className="field-label block">
                Použité podklady (každý na řádek)
                <textarea className="input mt-1 min-h-[90px] font-normal" maxLength={3000} value={f.basisText} onChange={(e) => setF((c) => ({ ...c, basisText: e.target.value }))} />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="vv-card space-y-4 p-5">
                <p className="text-sm text-ink-soft">
                  Vnější vlivy určuje komise – typicky projektant, revizní technik, zástupce investora nebo provozovatele a podle potřeby technolog.
                  Každý člen na konci potvrdí, že s určením souhlasí.
                </p>
                <PersonFields label="Předseda komise" person={f.chair} onChange={(p) => setF((c) => ({ ...c, chair: p }))} />
              </div>
              {f.members.map((m, i) => (
                <div key={i} className="vv-card space-y-3 p-5">
                  <PersonFields
                    label={`${i + 1}. člen komise`}
                    person={m}
                    onChange={(p) => setF((c) => ({ ...c, members: c.members.map((x, j) => (j === i ? p : x)) }))}
                  />
                  {f.members.length > 1 && (
                    <button
                      type="button"
                      className="vv-btn vv-btn-ghost px-3 py-1 text-sm text-bad"
                      onClick={() => setF((c) => ({ ...c, members: c.members.filter((_, j) => j !== i) }))}
                    >
                      Odebrat člena
                    </button>
                  )}
                </div>
              ))}
              {f.members.length < 8 && (
                <button type="button" className="vv-btn vv-btn-secondary" onClick={() => setF((c) => ({ ...c, members: [...c.members, { name: "", role: "" }] }))}>
                  + Přidat člena komise
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Pro každý prostor vyberte typ – hodnoty se předvyplní. Pak je komise projde a upraví podle skutečnosti. Červeně jsou vlivy, které
                nejsou normální.
              </p>
              {f.spaces.map((s, i) => (
                <SpaceEditor
                  key={s.id}
                  space={s}
                  index={i}
                  open={openSpace === s.id || (f.spaces.length === 1 && openSpace === null)}
                  onToggle={() => setOpenSpace((o) => (o === s.id ? "" : s.id))}
                  onChange={(ns) => updateSpace(i, ns)}
                  onRemove={() => setF((c) => ({ ...c, spaces: c.spaces.filter((x) => x.id !== s.id) }))}
                  onDuplicate={() => {
                    const copy = { ...s, id: newId(), name: `${s.name} (kopie)`, values: { ...s.values } };
                    setF((c) => ({ ...c, spaces: [...c.spaces.slice(0, i + 1), copy, ...c.spaces.slice(i + 1)] }));
                    setOpenSpace(copy.id);
                  }}
                  canRemove={f.spaces.length > 1}
                />
              ))}
              {f.spaces.length < 60 && (
                <button type="button" className="vv-btn vv-btn-secondary" onClick={addSpace}>
                  + Přidat prostor
                </button>
              )}
              {hasAq3 && (
                <div className="rounded-xl border border-[var(--vv-accent)] bg-[var(--vv-accent-soft)] px-4 py-3 text-sm">
                  <strong>AQ3 – přímé ohrožení bleskem.</strong> Ochranu je nutné navrhnout podle ČSN EN 62305 včetně analýzy rizika.{" "}
                  <Link href="/" target="_blank" className="vv-link font-semibold">
                    Spočítat analýzu rizika na ARONLINE
                  </Link>{" "}
                  nebo{" "}
                  <a href="https://fvsol.cz/?utm_source=aronline&utm_medium=vv&utm_campaign=aq3" target="_blank" rel="noopener" className="vv-link font-semibold">
                    nechat navrhnout hromosvod u FVSOL
                  </a>
                  .
                </div>
              )}
              <label className="field-label mt-4 block">
                Poznámky komise k protokolu (nepovinné)
                <textarea className="input mt-1 min-h-[70px] font-normal" maxLength={4000} value={f.notes} onChange={(e) => setF((c) => ({ ...c, notes: e.target.value }))} />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="vv-card p-5">
                <p className="font-semibold">Souhrn</p>
                <p className="text-sm text-ink-soft">
                  {f.object.name || "Objekt"} · {f.object.address}
                </p>
                <ul className="mt-3 divide-y divide-[var(--vv-line)]">
                  {f.spaces.map((s, i) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        {i + 1}) {s.name || "bez názvu"}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`vv-chip ${evaluations[i].normal ? "vv-chip-ok" : "vv-chip-bad"}`}>{evaluations[i].normal ? "normální" : "abnormální"}</span>
                        <span className="vv-chip vv-chip-accent">{evaluations[i].minIp}</span>
                        {!evaluations[i].normal && <span className="text-xs text-muted">{evaluations[i].abnormal.map((r) => r.value).join(", ")}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="vv-card space-y-3 p-5">
                <p className="font-semibold">Potvrzení členů komise</p>
                <p className="text-sm text-ink-soft">Každý člen komise potvrzuje, že prostory posoudil a s určením vnějších vlivů souhlasí.</p>
                {members.map((m, i) => (
                  <label key={i} className="flex items-start gap-2.5 rounded-lg border border-[var(--vv-line)] bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[#0f766e]"
                      checked={f.confirmations[i] === true}
                      onChange={(e) =>
                        setF((c) => {
                          const next = [...c.confirmations];
                          next[i] = e.target.checked;
                          return { ...c, confirmations: next };
                        })
                      }
                    />
                    <span>
                      <strong>{m.name || "(bez jména)"}</strong> {m.chair ? "(předseda)" : ""} – potvrzuji, že jsem jako člen komise posoudil(a) uvedené
                      prostory a souhlasím s určením vnějších vlivů v tomto protokolu.
                    </span>
                  </label>
                ))}
              </div>

              {!edit && (
                <div className="vv-card space-y-3 p-5">
                  <label className="field-label block">
                    E-mail pro odkaz na protokol *
                    <input type="email" className="input mt-1 font-normal" value={f.email} autoComplete="email" maxLength={200} onChange={(e) => setF((c) => ({ ...c, email: e.target.value }))} />
                    <span className="field-help font-normal">Pošleme vám odkaz, přes který protokol kdykoli znovu stáhnete nebo upravíte.</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0f766e]" checked={f.terms} onChange={(e) => setF((c) => ({ ...c, terms: e.target.checked }))} />
                    <span>
                      Souhlasím s{" "}
                      <Link className="vv-link" href="/pravni/obchodni-podminky" target="_blank">
                        obchodními podmínkami
                      </Link>{" "}
                      a beru na vědomí{" "}
                      <Link className="vv-link" href="/pravni/ochrana-osobnich-udaju" target="_blank">
                        zásady ochrany osobních údajů
                      </Link>
                      . *
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0f766e]" checked={f.marketing} onChange={(e) => setF((c) => ({ ...c, marketing: e.target.checked }))} />
                    <span>Chci občas dostat e-mail s novinkami ARONLINE a FVSOL (nepovinné, kdykoli lze odhlásit).</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="vv-btn vv-btn-secondary" disabled={step === 0} onClick={() => go(step - 1)}>
              ← Zpět
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="vv-btn vv-btn-primary" onClick={() => go(step + 1)}>
                Pokračovat →
              </button>
            ) : (
              <button type="button" className="vv-btn vv-btn-primary" disabled={busy} onClick={submit}>
                {busy ? "Ukládám…" : edit ? "Uložit změny" : "Vytvořit protokol zdarma"}
              </button>
            )}
          </div>
          <div className="mt-10">
            <VvPromoStrip campaign="formular" aq3={hasAq3} />
          </div>
        </div>
      )}
    </div>
  );
}
