"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Notice, Spinner } from "./ui";

interface Billing {
  products: { code: string; name: string; description: string; type: "ONE_TIME" | "SUBSCRIPTION"; priceHaler: number; features: string[] }[];
  balance: number;
  subscription: null | {
    productName: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    unlocksUsed: number;
    unlocksPerPeriod: number | null;
  };
  orders: { id: string; number: string; productName: string; amountHaler: number; status: string; createdAt: string; paidAt: string | null }[];
  ledger: { id: string; delta: number; reason: string; note: string | null; createdAt: string }[];
  payments: { available: boolean; reason?: string };
}

const ORDER_STATUS: Record<string, string> = { PENDING: "čeká na platbu", PAID: "zaplaceno", CANCELED: "zrušeno", FAILED: "chyba", REFUNDED: "vráceno" };
const REASON: Record<string, string> = { PURCHASE: "nákup", UNLOCK: "odemčení analýzy", REFUND: "vrácení platby", ADJUSTMENT: "úprava" };
const czk = (h: number) => `${(h / 100).toLocaleString("cs-CZ")} Kč`;

/** Zahájí platbu a přesměruje na platební bránu. */
export async function startPayment(productCode: string, projectId?: string | null) {
  const r = await api<{ gwUrl: string }>("/api/billing/order", { body: { productCode, projectId: projectId ?? null } });
  window.location.href = r.gwUrl;
}

export function BillingPanel() {
  const [b, setB] = useState<Billing | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => api<Billing>("/api/billing").then(setB);
  useEffect(() => {
    load().catch(() => setMsg({ tone: "error", text: "Údaje se nepodařilo načíst." }));
  }, []);

  if (!b) return <div className="mt-6"><Spinner /></div>;

  return (
    <div className="mt-6 space-y-10">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!b.payments.available && <Notice tone="warning" title="Platby jsou dočasně nedostupné">{b.payments.reason}</Notice>}

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
              <button
                className="btn btn-primary mt-4"
                disabled={!b.payments.available || busy != null || (p.type === "SUBSCRIPTION" && b.subscription != null)}
                onClick={async () => {
                  setBusy(p.code);
                  setMsg(null);
                  try {
                    await startPayment(p.code);
                  } catch (e) {
                    setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Platbu se nepodařilo zahájit." });
                    setBusy(null);
                  }
                }}
              >
                {busy === p.code ? "Přesměrovávám…" : p.type === "SUBSCRIPTION" ? "Předplatit" : "Koupit"}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">Jednorázovou analýzu můžete koupit i přímo u konkrétního projektu – po zaplacení se odemkne automaticky.</p>
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
                    <td className="px-4 py-2 font-mono text-xs">{o.number}</td>
                    <td className="px-4 py-2">{o.productName}</td>
                    <td className="px-4 py-2 text-right">{czk(o.amountHaler)}</td>
                    <td className="px-4 py-2">{ORDER_STATUS[o.status] ?? o.status}</td>
                    <td className="px-4 py-2">{new Date(o.createdAt).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
