"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { evaluateSpace } from "@/core/vv/evaluate";
import type { VvProtocolData } from "@/core/vv/schema";
import { VvPromoStrip } from "./chrome";
import { downloadFile, getToken, saveToken, vvApi } from "./client";

interface Protocol {
  id: string;
  data: VvProtocolData;
  email: string;
  premium: boolean;
  hasLogo: boolean;
  createdAt: string;
}

export function VvProtocolView({ id, price }: { id: string; price: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [p, setP] = useState<Protocol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Token: z fragmentu odkazu (#t=…) nebo z úložiště prohlížeče
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (hash) {
      saveToken(id, hash);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const t = hash ?? getToken(id);
    if (!t) {
      setError("Protokol lze otevřít jen přes odkaz z e-mailu nebo v prohlížeči, ve kterém byl vytvořen.");
      return;
    }
    setToken(t);
    const q = new URLSearchParams(window.location.search);
    if (q.get("novy")) setNotice("Protokol je hotový. Odkaz pro pozdější úpravy jsme poslali na váš e-mail.");
    if (q.get("upraveno")) setNotice("Změny jsou uložené.");
  }, [id]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await vvApi<{ protocol: Protocol }>(`/api/vv/protocols/${encodeURIComponent(id)}`, token);
      setP(r.protocol);
      setEmail((e) => e || r.protocol.email);
      if (r.protocol.hasLogo) {
        const res = await fetch(`/api/vv/protocols/${encodeURIComponent(id)}/logo`, { headers: { "X-VV-Token": token } });
        if (res.ok) setLogoUrl(URL.createObjectURL(await res.blob()));
      } else setLogoUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Protokol se nepodařilo načíst.");
    }
  }, [id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const evaluations = useMemo(() => (p ? p.data.spaces.map((s) => ({ s, ev: evaluateSpace(s.values) })) : []), [p]);
  const hasAq3 = evaluations.some(({ ev }) => ev.abnormal.some((r) => r.value === "AQ3"));

  const download = async (fmt: "pdf" | "docx") => {
    if (!token) return;
    setBusy(fmt);
    setError(null);
    try {
      await downloadFile(`/api/vv/protocols/${encodeURIComponent(id)}/${fmt}`, token, `protokol-vv.${fmt}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stažení se nezdařilo.");
    } finally {
      setBusy(null);
    }
  };

  const uploadLogo = async (file: File | null) => {
    if (!token || !file) return;
    if (file.size > 300_000) {
      setError("Logo může mít nejvýše 300 kB.");
      return;
    }
    setBusy("logo");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`/api/vv/protocols/${encodeURIComponent(id)}/logo`, { method: "POST", body: fd, headers: { "X-VV-Token": token } });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Logo se nepodařilo nahrát.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo se nepodařilo nahrát.");
    } finally {
      setBusy(null);
    }
  };

  const removeLogo = async () => {
    if (!token) return;
    setBusy("logo");
    try {
      await vvApi(`/api/vv/protocols/${encodeURIComponent(id)}/logo`, token, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo se nepodařilo odebrat.");
    } finally {
      setBusy(null);
    }
  };

  const order = async () => {
    if (!token) return;
    if (!terms) {
      setError("Pro objednávku potvrďte souhlas s obchodními podmínkami.");
      return;
    }
    setBusy("order");
    setError(null);
    try {
      const r = await vvApi<{ redirect: string }>(`/api/vv/protocols/${encodeURIComponent(id)}/order`, token, {
        body: { email: email.trim(), acceptTerms: true },
      });
      window.location.href = r.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Objednávku se nepodařilo založit.");
      setBusy(null);
    }
  };

  if (error && !p) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="vv-card p-6">
          <h1 className="text-xl font-bold">Protokol nelze otevřít</h1>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-primary mt-4">
            Vyplnit nový protokol
          </Link>
        </div>
      </div>
    );
  }
  if (!p) return <p className="mx-auto max-w-4xl px-4 py-12 text-sm text-muted">Načítám protokol…</p>;

  const logoInput = (
    <label className="vv-btn vv-btn-secondary cursor-pointer text-sm">
      {busy === "logo" ? "Nahrávám…" : p.hasLogo ? "Změnit logo" : "Nahrát logo (PNG/JPEG)"}
      <input type="file" accept="image/png,image/jpeg" className="sr-only" disabled={busy !== null} onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)} />
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      {notice && <div className="rounded-xl border border-[var(--vv-accent)] bg-[var(--vv-accent-soft)] px-4 py-3 text-sm">{notice}</div>}
      {error && (
        <div className="rounded-xl border border-bad bg-bad-soft px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="vv-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Protokol o určení vnějších vlivů{p.data.object.number ? ` · ${p.data.object.number}` : ""}</p>
            <h1 className="mt-1 text-2xl font-bold">{p.data.object.name}</h1>
            <p className="text-sm text-ink-soft">{p.data.object.address}</p>
          </div>
          <span className={`vv-chip ${p.premium ? "vv-chip-accent" : "bg-line-soft text-ink-soft"}`}>{p.premium ? "Profi verze" : "Zdarma"}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="vv-btn vv-btn-primary" disabled={busy !== null} onClick={() => void download("pdf")}>
            {busy === "pdf" ? "Připravuji PDF…" : "Stáhnout PDF"}
          </button>
          {p.premium && (
            <button type="button" className="vv-btn vv-btn-secondary" disabled={busy !== null} onClick={() => void download("docx")}>
              {busy === "docx" ? "Připravuji DOCX…" : "Stáhnout Word (DOCX)"}
            </button>
          )}
          <Link href={`/vnejsi-vlivy/novy?upravit=${encodeURIComponent(p.id)}`} className="vv-btn vv-btn-secondary">
            Upravit protokol
          </Link>
          <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-ghost">
            Nový protokol
          </Link>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Další krok:{" "}
          <Link href="/" className="vv-link font-semibold">
            analýza rizika ochrany před bleskem
          </Link>{" "}
          ·{" "}
          <a href="https://fvsol.cz/?utm_source=aronline&utm_medium=vv&utm_campaign=protokol-hore" rel="noopener" className="vv-link font-semibold">
            projekt FVE nebo hromosvodu u FVSOL
          </a>
        </p>

        <ul className="mt-5 divide-y divide-[var(--vv-line)] border-t border-[var(--vv-line)]">
          {evaluations.map(({ s, ev }, i) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                {i + 1}) {s.name}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className={`vv-chip ${ev.normal ? "vv-chip-ok" : "vv-chip-bad"}`}>{ev.normal ? "normální" : "abnormální"}</span>
                <span className="vv-chip vv-chip-accent">{ev.minIp}</span>
                {!ev.normal && <span className="text-xs text-muted">{ev.abnormal.map((r) => r.value).join(", ")}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {p.premium ? (
        <div className="vv-card p-6">
          <p className="font-semibold">Logo v záhlaví protokolu</p>
          <p className="mt-1 text-sm text-ink-soft">PNG nebo JPEG do 300 kB. Logo se zobrazí v PDF i DOCX.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Nahrané logo" className="h-12 max-w-[180px] rounded border border-[var(--vv-line)] bg-white object-contain p-1" />
            )}
            {logoInput}
            {p.hasLogo && (
              <button type="button" className="vv-btn vv-btn-ghost text-sm" disabled={busy !== null} onClick={() => void removeLogo()}>
                Odebrat logo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="vv-card border-[var(--vv-accent)] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-semibold text-[var(--vv-accent-strong)]">Profi verze za {price} Kč</p>
            <span className="text-sm text-muted">jednorázově k tomuto protokolu</span>
          </div>
          <ul className="mt-3 grid gap-1.5 text-sm text-ink-soft sm:grid-cols-3">
            <li>✓ bez vodoznaku, patičky a zámku PDF</li>
            <li>✓ vaše logo v záhlaví</li>
            <li>✓ editovatelný Word (DOCX)</li>
          </ul>
          <div className="mt-4 rounded-lg border border-[var(--vv-line)] bg-white p-4">
            <p className="text-sm font-medium">1. Logo (nepovinné – lze nahrát i po zaplacení)</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Nahrané logo" className="h-12 max-w-[180px] rounded border border-[var(--vv-line)] bg-white object-contain p-1" />
              )}
              {logoInput}
            </div>
            <p className="mt-4 text-sm font-medium">2. Platba kartou</p>
            <label className="field-label mt-2 block">
              E-mail pro doklad o platbě
              <input type="email" className="input mt-1 font-normal" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="mt-2 flex items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0f766e]" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>
                Souhlasím s{" "}
                <Link className="vv-link" href="/pravni/obchodni-podminky" target="_blank">
                  obchodními podmínkami
                </Link>
                , žádám o zpřístupnění placené verze ihned po zaplacení a beru na vědomí, že tím zaniká právo odstoupit od smlouvy.
              </span>
            </label>
            <button type="button" className="vv-btn vv-btn-primary mt-3" disabled={busy !== null} onClick={() => void order()}>
              {busy === "order" ? "Přesměrovávám na platbu…" : `Zaplatit ${price} Kč kartou`}
            </button>
            <p className="mt-2 text-xs text-muted">Platbu zpracuje GoPay. Doklad o zaplacení přijde e-mailem.</p>
          </div>
        </div>
      )}

      <VvPromoStrip campaign="protokol" aq3={hasAq3} />
    </div>
  );
}
