"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PCI_NOTE, RECURRENCE_CONSENT, recurrenceTerms } from "@/config/recurrence";
import { api, ApiError } from "@/lib/api";
import { Checkbox, Notice, Spinner } from "./ui";

interface Product {
  code: string;
  name: string;
  description: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  priceHaler: number;
  periodMonths: number | null;
  features: string[];
}

interface Billing {
  isAdmin?: boolean;
  contactEmail: string;
  products: Product[];
  balance: number;
  subscription: null | {
    productName: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    unlocksUsed: number;
    unlocksPerPeriod: number | null;
  };
  orders: { id: string; number: string; productName: string; amountHaler: number; status: string; createdAt: string; paidAt: string | null; paymentMethod: string }[];
  invoices: { id: string; number: string; issuedAt: string; totalHaler: number; canceled: boolean }[];
  ledger: { id: string; delta: number; reason: string; note: string | null; createdAt: string }[];
  payments: { available: boolean; reason?: string };
  bank: { available: boolean; reason?: string };
}

const ORDER_STATUS: Record<string, string> = { PENDING: "čeká na platbu", PAID: "zaplaceno", CANCELED: "zrušeno", FAILED: "chyba", REFUNDED: "vráceno" };
const REASON: Record<string, string> = { PURCHASE: "nákup", UNLOCK: "odemčení analýzy", REFUND: "vrácení platby", ADJUSTMENT: "úprava" };
const czk = (h: number) => `${(h / 100).toLocaleString("cs-CZ")} Kč`;

/** Zahájí platbu: kartou → přesměrování na platební bránu, převodem → stránka s platebními údaji. */
export async function startPayment(
  productCode: string,
  projectId?: string | null,
  extra?: { email?: string; acceptLiability?: boolean; method?: "CARD" | "BANK"; recurrenceConsent?: boolean },
) {
  const r = await api<{ redirect: string }>("/api/billing/order", {
    body: { productCode, projectId: projectId ?? null, ...(extra ?? {}) },
  });
  window.location.href = r.redirect;
}

/** Parametry opakované platby + souhlas (požadavek GoPay – odděleně od obchodních podmínek). */
export function RecurrenceConsentBox({
  product,
  contactEmail,
  consent,
  onConsent,
}: {
  product: Pick<Product, "name" | "priceHaler" | "periodMonths">;
  contactEmail: string;
  consent: boolean;
  onConsent: (v: boolean) => void;
}) {
  const terms = recurrenceTerms({ productName: product.name, priceHaler: product.priceHaler, periodMonths: product.periodMonths ?? 1, contactEmail });
  return (
    <div className="rounded-md border border-ink bg-sheet p-4 text-sm" data-testid="recurrence-terms">
      <p className="font-semibold">Parametry opakované platby</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[11rem_1fr]">
        {terms.map((t) => (
          <div key={t.label} className="contents">
            <dt className="text-ink-soft">{t.label}</dt>
            <dd>{t.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-soft">{PCI_NOTE}</p>
      <p className="mt-1 text-xs text-ink-soft">
        Podrobnosti v{" "}
        <Link className="link" href="/pravni/obchodni-podminky#opakovane-platby" target="_blank">
          obchodních podmínkách (čl. Opakované platby)
        </Link>
        .
      </p>
      <div className="mt-3">
        <Checkbox checked={consent} onChange={onConsent} label={<span>{RECURRENCE_CONSENT}</span>} />
      </div>
    </div>
  );
}

export function BillingPanel() {
  const [b, setB] = useState<Billing | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingSub, setPendingSub] = useState<string | null>(null);
  const [recConsent, setRecConsent] = useState(false);

  const load = () => api<Billing>("/api/billing").then(setB);
  useEffect(() => {
    load().catch(() => setMsg({ tone: "error", text: "Údaje se nepodařilo načíst." }));
  }, []);

  if (!b) return <div className="mt-6"><Spinner /></div>;

  return (
    <div className="mt-6 space-y-10">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {b.isAdmin && (
        <Notice tone="ok" title="Účet správce">
          Jako správce služby odemykáte dokumentaci analýz bez platby a bez odečtu kreditů.
        </Notice>
      )}
      {!b.payments.available && (
        <Notice tone="warning" title="Platba kartou je dočasně nedostupná">
          {b.payments.reason}
          {b.bank.available ? " Analýzu i balíček můžete zaplatit bankovním převodem." : ""}
        </Notice>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <p className="text-sm text-ink-soft">Zůstatek kreditů</p>
          <p className="type-wide mt-1 text-4xl font-bold">{b.balance}</p>
          <p className="mt-1 text-sm text-ink-soft">1 kredit = odemčení dokumentace jedné analýzy</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-ink-soft">Předplatné</p>
          {b.subscription ? (
            <>
              <p className="mt-1 text-lg font-semibold">{b.subscription.productName}</p>
              <p className="text-sm">
                {b.subscription.cancelAtPeriodEnd ? "Zrušeno, platí do " : "Další platba "}
                {new Date(b.subscription.currentPeriodEnd).toLocaleDateString("cs-CZ")}
              </p>
              <p className="text-sm">
                Využito v období: {b.subscription.unlocksUsed}
                {b.subscription.unlocksPerPeriod != null ? ` z ${b.subscription.unlocksPerPeriod}` : ""} analýz
              </p>
              {!b.subscription.cancelAtPeriodEnd && (
                <button
                  className="btn btn-danger mt-3 px-3 py-1.5 text-sm"
                  disabled={busy != null}
                  onClick={async () => {
                    if (!window.confirm("Zrušit předplatné? Platí do konce zaplaceného období, další platby se nestrhnou.")) return;
                    setBusy("cancel");
                    try {
                      await api("/api/billing/cancel", { body: {} });
                      setMsg({ tone: "ok", text: "Předplatné je zrušené. Platí do konce zaplaceného období." });
                      await load();
                    } catch (e) {
                      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Zrušení se nezdařilo." });
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Zrušit předplatné
                </button>
              )}
            </>
          ) : (
            <p className="mt-1 text-ink-soft">Nemáte aktivní předplatné.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl">Koupit</h2>
        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {b.products.map((p) => (
            <div key={p.code} className="flex flex-col bg-sheet p-5">
              <h3 className="text-base">{p.name}</h3>
              <p className="type-wide mt-2 text-2xl font-bold">
                {czk(p.priceHaler)}
                {p.type === "SUBSCRIPTION" && <span className="text-sm font-normal text-muted"> / měsíc</span>}
              </p>
              <ul className="mt-3 flex-1 space-y-1 text-sm text-ink-soft">
                {(p.features ?? []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {(
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    className="btn btn-primary"
                    disabled={!b.payments.available || busy != null || (p.type === "SUBSCRIPTION" && b.subscription != null)}
                    onClick={async () => {
                      if (p.type === "SUBSCRIPTION") {
                        setRecConsent(false);
                        setPendingSub(p.code);
                        setTimeout(() => document.getElementById("souhlas-opakovana-platba")?.scrollIntoView({ behavior: "smooth" }), 50);
                        return;
                      }
                      setBusy(p.code);
                      setMsg(null);
                      try {
                        await startPayment(p.code, null, { method: "CARD" });
                      } catch (e) {
                        setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Platbu se nepodařilo zahájit." });
                        setBusy(null);
                      }
                    }}
                  >
                    {busy === p.code ? "Přesměrovávám…" : p.type === "SUBSCRIPTION" ? "Předplatit kartou" : "Zaplatit kartou"}
                  </button>
                  {p.type === "ONE_TIME" && b.bank.available && (
                    <button
                      className="btn btn-secondary"
                      disabled={busy != null}
                      onClick={async () => {
                        setBusy(p.code + ":bank");
                        setMsg(null);
                        try {
                          await startPayment(p.code, null, { method: "BANK" });
                        } catch (e) {
                          setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Objednávku se nepodařilo založit." });
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === p.code + ":bank" ? "Zakládám…" : "Zaplatit převodem"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {pendingSub && (() => {
          const p = b.products.find((x) => x.code === pendingSub);
          if (!p) return null;
          return (
            <div className="mt-4 max-w-3xl space-y-3" id="souhlas-opakovana-platba">
              <h3 className="text-lg">Objednávka předplatného – {p.name}</h3>
              <RecurrenceConsentBox product={p} contactEmail={b.contactEmail} consent={recConsent} onConsent={setRecConsent} />
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  disabled={!recConsent || busy != null}
                  onClick={async () => {
                    setBusy(p.code);
                    setMsg(null);
                    try {
                      await startPayment(p.code, null, { method: "CARD", recurrenceConsent: true });
                    } catch (e) {
                      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Platbu se nepodařilo zahájit." });
                      setBusy(null);
                    }
                  }}
                >
                  {busy === p.code ? "Přesměrovávám…" : "Zaplatit kartou a založit opakovanou platbu"}
                </button>
                <button className="btn btn-ghost" onClick={() => setPendingSub(null)}>
                  Zpět
                </button>
              </div>
            </div>
          );
        })()}
        <p className="mt-3 text-sm text-muted">
          Jednorázovou analýzu můžete koupit i přímo u konkrétního projektu – po zaplacení se odemkne automaticky. Při platbě převodem se kredit připíše po přijetí
          platby na účet (obvykle 1–2 pracovní dny). Předplatné se hradí jen kartou (opakovaná platba).
        </p>
      </section>

      <section>
        <h2 className="text-xl">Objednávky</h2>
        {b.orders.length === 0 ? (
          <p className="mt-2 text-ink-soft">Zatím žádné objednávky.</p>
        ) : (
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-4 py-2">Číslo</th>
                  <th className="px-4 py-2">Produkt</th>
                  <th className="px-4 py-2 text-right">Částka</th>
                  <th className="px-4 py-2">Stav</th>
                  <th className="px-4 py-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {b.orders.map((o) => (
                  <tr key={o.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">
                      {o.paymentMethod === "BANK" ? (
                        <Link className="link" href={`/app/objednavky/${o.id}`}>
                          {o.number}
                        </Link>
                      ) : (
                        o.number
                      )}
                    </td>
                    <td className="px-4 py-2">{o.productName}</td>
                    <td className="px-4 py-2 text-right">{czk(o.amountHaler)}</td>
                    <td className="px-4 py-2">
                      {ORDER_STATUS[o.status] ?? o.status}
                      {o.paymentMethod === "BANK" ? " (převod)" : ""}
                    </td>
                    <td className="px-4 py-2">{new Date(o.createdAt).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl">Doklady</h2>
        {b.invoices.length === 0 ? (
          <p className="mt-2 text-ink-soft">Doklady se vystaví automaticky po přijetí platby.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft text-sm">
            {b.invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  Faktura {i.number} – {new Date(i.issuedAt).toLocaleDateString("cs-CZ")}
                  {i.canceled ? " (stornováno)" : ""}
                </span>
                <span className="flex items-center gap-3">
                  {czk(i.totalHaler)}
                  <a className="link" href={`/api/invoices/${i.id}`} target="_blank" rel="noopener">
                    PDF
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl">Pohyby kreditů</h2>
        {b.ledger.length === 0 ? (
          <p className="mt-2 text-ink-soft">Zatím žádné pohyby.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft text-sm">
            {b.ledger.map((l) => (
              <li key={l.id} className="flex justify-between py-1.5">
                <span>
                  {new Date(l.createdAt).toLocaleDateString("cs-CZ")} – {REASON[l.reason] ?? l.reason}
                  {l.note ? ` (${l.note})` : ""}
                </span>
                <span className={l.delta > 0 ? "text-ok" : "text-ink"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
