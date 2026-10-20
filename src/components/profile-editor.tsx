"use client";

import { useEffect, useRef, useState } from "react";
import type { ProcessorData } from "@/domain/project";
import { api, ApiError } from "@/lib/api";
import { StampPreview } from "./stamp";
import { Checkbox, Notice, Spinner, TextInput } from "./ui";

interface Profile {
  id: string;
  label: string;
  isDefault: boolean;
  data: ProcessorData;
  hasLogo: boolean;
}

const EMPTY: ProcessorData = {
  fullName: "",
  company: "",
  ico: "",
  dic: "",
  address: "",
  email: "",
  phone: "",
  authorization: "",
  stampNote: "",
  appearance: { accentColor: "#1f4e79", headerText: "", footerText: "", showLogoOnCover: true },
};

export function ProfileEditor() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [current, setCurrent] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(selectId?: string) {
    const r = await api<{ profiles: Profile[] }>("/api/profiles");
    setProfiles(r.profiles);
    setCurrent(r.profiles.find((p) => p.id === selectId) ?? r.profiles[0] ?? null);
  }
  useEffect(() => {
    load().catch(() => setMsg({ tone: "error", text: "Profily se nepodařilo načíst." }));
  }, []);

  if (!profiles) return <div className="mt-6"><Spinner /></div>;
  const p = current;
  const set = (patch: Partial<ProcessorData>) => p && setCurrent({ ...p, data: { ...p.data, ...patch } });
  const setAp = (patch: Partial<ProcessorData["appearance"]>) => p && setCurrent({ ...p, data: { ...p.data, appearance: { ...p.data.appearance, ...patch } } });

  async function save() {
    if (!p) return;
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/profiles/${p.id}`, { method: "PUT", body: { label: p.label, isDefault: p.isDefault, data: p.data } });
      setMsg({ tone: "ok", text: "Profil je uložený." });
      await load(p.id);
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Uložení se nezdařilo." });
    } finally {
      setBusy(false);
    }
  }

  async function addProfile() {
    const r = await api<{ id: string }>("/api/profiles", { body: { label: "Nový profil", isDefault: false, data: EMPTY } });
    await load(r.id);
  }

  async function uploadLogo(file: File) {
    if (!p) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("logo", file);
    const res = await fetch(`/api/profiles/${p.id}/logo`, { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg({ tone: "error", text: j.message ?? "Logo se nepodařilo nahrát." });
      return;
    }
    setLogoVersion((v) => v + 1);
    await load(p.id);
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {profiles.map((x) => (
            <button
              key={x.id}
              className={`btn ${x.id === p?.id ? "btn-primary" : "btn-secondary"} px-3 py-1.5 text-sm`}
              onClick={() => setCurrent(x)}
            >
              {x.label}
              {x.isDefault ? " (výchozí)" : ""}
            </button>
          ))}
          <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={addProfile}>
            Přidat profil
          </button>
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {p && (
          <>
            <fieldset className="panel grid gap-4 p-5 sm:grid-cols-2">
              <legend className="px-1 font-semibold">Zpracovatel</legend>
              <TextInput label="Název profilu" value={p.label} onChange={(v) => setCurrent({ ...p, label: v })} help="Jen pro vaši orientaci (např. Firma, OSVČ)." />
              <div className="flex items-end pb-2">
                <Checkbox label="Výchozí profil pro nové analýzy" checked={p.isDefault} onChange={(v) => setCurrent({ ...p, isDefault: v })} />
              </div>
              <TextInput label="Jméno a příjmení zpracovatele" value={p.data.fullName} onChange={(v) => set({ fullName: v })} />
              <TextInput label="Autorizace (nepovinné)" value={p.data.authorization} onChange={(v) => set({ authorization: v })} help="Např. číslo autorizace ČKAIT." />
              <TextInput label="Firma" value={p.data.company} onChange={(v) => set({ company: v })} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="IČO" value={p.data.ico} onChange={(v) => set({ ico: v })} maxLength={20} />
                <TextInput label="DIČ" value={p.data.dic} onChange={(v) => set({ dic: v })} maxLength={20} />
              </div>
              <div className="sm:col-span-2">
                <TextInput label="Adresa" value={p.data.address} onChange={(v) => set({ address: v })} />
              </div>
              <TextInput label="E-mail" type="email" value={p.data.email} onChange={(v) => set({ email: v })} />
              <TextInput label="Telefon" value={p.data.phone} onChange={(v) => set({ phone: v })} />
              <div className="sm:col-span-2">
                <TextInput label="Doplňující řádek razítka (nepovinné)" value={p.data.stampNote} onChange={(v) => set({ stampNote: v })} />
              </div>
            </fieldset>

            <fieldset className="panel grid gap-4 p-5 sm:grid-cols-2">
              <legend className="px-1 font-semibold">Vzhled dokumentu</legend>
              <div>
                <label className="field-label" htmlFor="accent">
                  Barva nadpisů
                </label>
                <input
                  id="accent"
                  type="color"
                  className="h-10 w-20 cursor-pointer border border-line bg-sheet"
                  value={p.data.appearance.accentColor}
                  onChange={(e) => setAp({ accentColor: e.target.value })}
                />
              </div>
              <div className="flex items-end pb-2">
                <Checkbox label="Zobrazit logo na titulní straně" checked={p.data.appearance.showLogoOnCover} onChange={(v) => setAp({ showLogoOnCover: v })} />
              </div>
              <TextInput label="Text záhlaví (nepovinné)" value={p.data.appearance.headerText} onChange={(v) => setAp({ headerText: v })} help="Výchozí: název projektu." />
              <TextInput label="Text zápatí (nepovinné)" value={p.data.appearance.footerText} onChange={(v) => setAp({ footerText: v })} help="Výchozí: firma a e-mail." />
              <div className="sm:col-span-2">
                <p className="field-label">Logo</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="text-sm"
                    onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                  />
                  {p.hasLogo && (
                    <button
                      className="btn btn-ghost px-2 py-1 text-sm"
                      onClick={async () => {
                        await api(`/api/profiles/${p.id}/logo`, { method: "DELETE" });
                        await load(p.id);
                      }}
                    >
                      Odebrat logo
                    </button>
                  )}
                </div>
                <p className="field-help">PNG nebo JPEG, nejvýše 300 kB.</p>
              </div>
            </fieldset>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={save} disabled={busy}>
                {busy ? "Ukládám…" : "Uložit profil"}
              </button>
              {profiles.length > 1 && (
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    if (!window.confirm("Smazat tento profil?")) return;
                    try {
                      await api(`/api/profiles/${p.id}`, { method: "DELETE" });
                      await load();
                    } catch (e) {
                      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Smazání se nezdařilo." });
                    }
                  }}
                >
                  Smazat profil
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {p && (
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-sm font-semibold">Náhled razítka</p>
          <StampPreview processor={p.data} logoUrl={p.hasLogo ? `/api/profiles/${p.id}/logo?v=${logoVersion}` : null} />
          <p className="mt-2 text-xs text-muted">Údaje o stavbě a investorovi se doplní z konkrétního projektu.</p>
        </aside>
      )}
    </div>
  );
}
