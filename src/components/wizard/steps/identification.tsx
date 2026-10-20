"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DOC_STAGE_LABELS, DOC_STAGES, type ProcessorData } from "@/domain/project";
import { api } from "@/lib/api";
import { StampPreview } from "../../stamp";
import { SelectInput, TextInput } from "../../ui";
import type { StepProps } from "../wizard";

interface Profile {
  id: string;
  label: string;
  isDefault: boolean;
  data: ProcessorData;
  hasLogo: boolean;
}

export function StepIdentification({ data, update, project }: StepProps) {
  const id = data.identification;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    api<{ profiles: Profile[] }>("/api/profiles").then((r) => setProfiles(r.profiles)).catch(() => setProfiles([]));
  }, []);
  const profile = profiles.find((p) => p.id === id.processorProfileId) ?? profiles.find((p) => p.isDefault) ?? profiles[0];
  const locked = project.objectLockedAt != null;
  const set = (fn: (i: typeof id) => void) => update((d) => fn(d.identification));

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-semibold">Projekt</legend>
          <div className="sm:col-span-2">
            <TextInput label="Název projektu" value={id.projectName} onChange={(v) => set((i) => (i.projectName = v))} />
          </div>
          <TextInput label="Číslo zakázky" value={id.jobNumber} onChange={(v) => set((i) => (i.jobNumber = v))} />
          <SelectInput
            label="Stupeň dokumentace"
            value={id.docStage}
            onChange={(v) => set((i) => (i.docStage = v))}
            options={DOC_STAGES.map((s) => ({ value: s, label: DOC_STAGE_LABELS[s] }))}
          />
          <TextInput label="Datum zpracování" type="date" value={id.date} onChange={(v) => set((i) => (i.date = v))} />
          <TextInput label="Revize" value={id.revision} onChange={(v) => set((i) => (i.revision = v))} placeholder="např. Rev01" />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-semibold">Investor / objednatel</legend>
          <TextInput label="Název nebo jméno" value={id.investor.name} onChange={(v) => set((i) => (i.investor.name = v))} />
          <TextInput label="IČO (nepovinné)" value={id.investor.ico} onChange={(v) => set((i) => (i.investor.ico = v))} maxLength={20} />
          <div className="sm:col-span-2">
            <TextInput label="Adresa" value={id.investor.address} onChange={(v) => set((i) => (i.investor.address = v))} />
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-semibold">Stavba</legend>
          <div className="sm:col-span-2">
            <TextInput label="Název stavby" value={id.building.name} onChange={(v) => set((i) => (i.building.name = v))} />
          </div>
          <div className="sm:col-span-2">
            <TextInput
              label="Adresa stavby"
              value={id.building.address}
              disabled={locked}
              onChange={(v) => set((i) => (i.building.address = v))}
              help="Doplní se automaticky po výběru objektu v mapě."
            />
          </div>
          <TextInput label="Parcela" value={id.building.parcel} disabled={locked} onChange={(v) => set((i) => (i.building.parcel = v))} />
          <TextInput label="Katastrální území" value={id.building.cadastralArea} onChange={(v) => set((i) => (i.building.cadastralArea = v))} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 font-semibold">Zpracovatel</legend>
          {profiles.length > 0 ? (
            <SelectInput
              label="Profil zpracovatele"
              value={profile?.id ?? null}
              onChange={(v) => set((i) => (i.processorProfileId = v))}
              options={profiles.map((p) => ({ value: p.id, label: `${p.label}${p.isDefault ? " (výchozí)" : ""}` }))}
              help={
                <>
                  Údaje zpracovatele upravíte v{" "}
                  <Link className="link" href="/app/profil">
                    profilu
                  </Link>
                  . Změny se projeví ve všech projektech.
                </>
              }
            />
          ) : (
            <p className="text-sm text-ink-soft">
              Nemáte vyplněný profil zpracovatele.{" "}
              <Link className="link" href="/app/profil">
                Vyplnit profil
              </Link>
            </p>
          )}
          <TextInput
            label="Jiný zpracovatel jen pro tento projekt (nepovinné)"
            value={id.processorOverride?.fullName ?? ""}
            onChange={(v) => set((i) => (i.processorOverride = { ...(i.processorOverride ?? {}), fullName: v }))}
            help="Vyplňte, pokud analýzu zpracovává jiná osoba než v profilu."
          />
        </fieldset>
      </div>
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <p className="mb-2 text-sm font-semibold">Razítko dokumentu</p>
        <StampPreview
          processor={{ ...(profile?.data ?? {}), ...(id.processorOverride?.fullName ? { fullName: id.processorOverride.fullName } : {}) }}
          identification={id}
          logoUrl={profile?.hasLogo ? `/api/profiles/${profile.id}/logo` : null}
        />
      </aside>
    </div>
  );
}
