"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Notice, SelectInput, TextInput } from "./ui";

export function NewProjectForm({ types }: { types: { key: string; label: string; group: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("family_house");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api<{ id: string }>("/api/projects", { body: { name: name.trim() || "Nová analýza", buildingType: type } });
          router.push(`/app/projekty/${r.id}`);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Projekt se nepodařilo založit.");
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold">Nová analýza</p>
      {error && <Notice tone="error">{error}</Notice>}
      <TextInput label="Název projektu" value={name} onChange={setName} placeholder="např. RD Novák – FVE 10 kWp" />
      <SelectInput
        label="Druh objektu"
        value={type}
        onChange={setType}
        options={types.map((t) => ({ value: t.key, label: t.label, group: t.group }))}
        help="Podle druhu objektu se předvyplní zóny a typické hodnoty ztrát."
      />
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Zakládám…" : "Založit analýzu"}
      </button>
    </form>
  );
}

export function ProjectRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      <button
        className="btn btn-ghost px-2 py-1 text-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ id: string }>(`/api/projects/${id}/duplicate`, { body: {} });
            router.push(`/app/projekty/${r.id}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        Kopírovat
      </button>
      <button
        className="btn btn-ghost px-2 py-1 text-sm text-bad"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Smazat projekt „${name}“? Akci nelze vrátit.`)) return;
          setBusy(true);
          try {
            await api(`/api/projects/${id}`, { method: "DELETE" });
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        Smazat
      </button>
    </div>
  );
}
