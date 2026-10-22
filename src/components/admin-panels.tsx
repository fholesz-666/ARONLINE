"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useState } from "react";
import { SITE_TEXTS, type SiteTextKey } from "@/config/site-texts";
import { api, ApiError } from "@/lib/api";
import { Checkbox, Notice, NumberInput, Spinner, TextInput } from "./ui";

const czk = (h: number) => `${(h / 100).toLocaleString("cs-CZ")} Kč`;
const dt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" }) : "–");
const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

type Msg = { tone: "ok" | "error"; text: string } | null;

const ADMIN_NAV = [
  { href: "/app/admin", label: "Přehled", exact: true },
  { href: "/app/admin/uzivatele", label: "Uživatelé a kredity" },
  { href: "/app/admin/objednavky", label: "Objednávky a doklady" },
  { href: "/app/admin/texty", label: "Texty webu" },
  { href: "/app/admin/nastaveni", label: "Provozovatel a platby" },
  { href: "/app/admin/cenik", label: "Ceník" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="mt-4 flex flex-wrap gap-1 border-b border-line pb-2 text-sm" aria-label="Správa">
      {ADMIN_NAV.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-sm px-2.5 py-1.5 no-underline ${active ? "bg-ink text-white" : "text-ink-soft hover:bg-line-soft hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TextArea({ label, value, onChange, help, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; help?: string; rows?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {help && <p className="text-xs text-muted">{help}</p>}
      <textarea id={id} className="input mt-1 w-full" rows={rows} value={value} maxLength={4000} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Přehled                                                            */
/* ------------------------------------------------------------------ */

interface Overview {
  users: number;
  guests: number;
  projects: number;
  activeSubscriptions: number;
  paidOrdersThisMonth: number;
  invoicedThisMonthHaler: number;
  invoicesThisMonth: number;
  pendingBankOrders: number;
}

export function AdminOverview() {
  const [o, setO] = useState<Overview | null>(null);
  useEffect(() => {
    api<Overview>("/api/admin/overview").then(setO).catch(() => undefined);
  }, []);
  if (!o) return <Spinner />;
  const tiles: [string, string | number, string?][] = [
    ["Registrovaní uživatelé", o.users, `+ ${o.guests} hostů`],
    ["Analýzy (projekty)", o.projects],
    ["Aktivní předplatné", o.activeSubscriptions],
    ["Zaplaceno tento měsíc", czk(o.invoicedThisMonthHaler), `${o.invoicesThisMonth} dokladů`],
    ["Čeká na platbu převodem", o.pendingBankOrders],
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map(([label, value, sub]) => (
        <div key={label} className="bg-sheet p-4">
          <p className="text-xs text-ink-soft">{label}</p>
          <p className="type-wide mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
      ))}
      {o.pendingBankOrders > 0 && (
        <div className="bg-sheet p-4 sm:col-span-2 lg:col-span-5">
          <Link className="link text-sm" href="/app/admin/objednavky?stav=PENDING">
            Zkontrolovat objednávky placené převodem →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Uživatelé a kredity                                                */
/* ------------------------------------------------------------------ */

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  isGuest: boolean;
  emailVerified: boolean;
  disabledAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  workspaces: {
    id: string;
    name: string;
    type: string;
    role: string;
    balance: number;
    projects: number;
    subscription: { code: string; end: string; status: string } | null;
  }[];
}

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [guests, setGuests] = useState(false);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ users: AdminUser[]; total: number } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<{ users: AdminUser[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(q)}&guests=${guests ? 1 : 0}&offset=${offset}`)
        .then(setData)
        .catch((e) => setMsg({ tone: "error", text: errText(e, "Uživatele se nepodařilo načíst.") })),
    [q, guests, offset],
  );
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id: string, action: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body: { action } });
      setMsg({ tone: "ok", text: "Uloženo." });
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: errText(e, "Akce se nezdařila.") });
    }
  };

  return (
    <div className="space-y-4">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-72">
          <TextInput label="Hledat (e-mail nebo jméno)" value={q} onChange={(v) => { setQ(v); setOffset(0); }} />
        </div>
        <Checkbox label="Zobrazit i hosty" checked={guests} onChange={(v) => { setGuests(v); setOffset(0); }} />
      </div>
      {!data ? (
        <Spinner />
      ) : (
        <>
          <p className="text-sm text-muted">Nalezeno {data.total} uživatelů.</p>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-3 py-2">Uživatel</th>
                  <th className="px-3 py-2">Stav</th>
                  <th className="px-3 py-2 text-right">Kredity</th>
                  <th className="px-3 py-2">Předplatné</th>
                  <th className="px-3 py-2">Registrace / naposledy</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => {
                  const own = u.workspaces.find((w) => w.role === "OWNER") ?? u.workspaces[0];
                  return (
                    <Fragment key={u.id}>
                      <tr className="border-b border-line-soft align-top">
                        <td className="px-3 py-2">
                          <p className="font-semibold">{u.name}</p>
                          <p className="text-xs text-ink-soft">{u.email}</p>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {u.role === "ADMIN" && <span className="mr-1 rounded-sm bg-ink px-1.5 py-0.5 text-white">správce</span>}
                          {u.isGuest && <span className="mr-1 rounded-sm bg-line-soft px-1.5 py-0.5">host</span>}
                          {!u.isGuest && !u.emailVerified && <span className="mr-1 rounded-sm bg-signal-soft px-1.5 py-0.5">neověřený e-mail</span>}
                          {u.disabledAt && <span className="rounded-sm bg-bad-soft px-1.5 py-0.5">zablokován</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{own ? own.balance : "–"}</td>
                        <td className="px-3 py-2 text-xs">
                          {own?.subscription ? `${own.subscription.code} do ${new Date(own.subscription.end).toLocaleDateString("cs-CZ")}` : "–"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {dt(u.createdAt)}
                          <br />
                          {dt(u.lastSeenAt)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button className="btn btn-secondary px-2 py-1 text-xs" onClick={() => setOpen(open === u.id ? null : u.id)}>
                            {open === u.id ? "Zavřít" : "Spravovat"}
                          </button>
                        </td>
                      </tr>
                      {open === u.id && (
                        <tr className="border-b border-line bg-paper">
                          <td colSpan={6} className="px-3 py-3">
                            <UserDetail user={u} act={act} onChanged={load} setMsg={setMsg} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
              ← Předchozí
            </button>
            <button className="btn btn-ghost text-sm" disabled={offset + 50 >= data.total} onClick={() => setOffset(offset + 50)}>
              Další →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function UserDetail({
  user: u,
  act,
  onChanged,
  setMsg,
}: {
  user: AdminUser;
  act: (id: string, action: string, confirmText?: string) => Promise<void>;
  onChanged: () => Promise<unknown>;
  setMsg: (m: Msg) => void;
}) {
  const [ws, setWs] = useState(u.workspaces[0]?.id ?? "");
  const [delta, setDelta] = useState<number | null>(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2 text-sm">
        <p className="font-semibold">Účet</p>
        <div className="flex flex-wrap gap-2">
          {!u.isGuest && !u.emailVerified && (
            <button className="btn btn-secondary px-2 py-1 text-xs" onClick={() => act(u.id, "verify")}>
              Označit e-mail jako ověřený
            </button>
          )}
          {u.disabledAt ? (
            <button className="btn btn-secondary px-2 py-1 text-xs" onClick={() => act(u.id, "enable")}>
              Odblokovat
            </button>
          ) : (
            <button className="btn btn-danger px-2 py-1 text-xs" onClick={() => act(u.id, "disable", `Zablokovat účet ${u.email}? Uživatel bude odhlášen.`)}>
              Zablokovat
            </button>
          )}
          {!u.isGuest &&
            (u.role === "ADMIN" ? (
              <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => act(u.id, "make_user", `Odebrat roli správce účtu ${u.email}?`)}>
                Odebrat roli správce
              </button>
            ) : (
              <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => act(u.id, "make_admin", `Udělit roli správce účtu ${u.email}? Získá plný přístup ke správě.`)}>
                Udělit roli správce
              </button>
            ))}
        </div>
        <p className="font-semibold">Pracovní prostory</p>
        <ul className="space-y-1">
          {u.workspaces.map((w) => (
            <li key={w.id}>
              {w.name} ({w.type === "COMPANY" ? "firma" : "osobní"}, {w.role.toLowerCase()}) – kredity {w.balance}, analýz {w.projects}
            </li>
          ))}
        </ul>
      </div>
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!delta || !ws) return;
          setBusy(true);
          try {
            await api("/api/admin/credits", { body: { workspaceId: ws, delta, note } });
            setMsg({ tone: "ok", text: `Kredity upraveny o ${delta > 0 ? "+" : ""}${delta}.` });
            setNote("");
            await onChanged();
          } catch (err) {
            setMsg({ tone: "error", text: errText(err, "Úprava kreditů se nezdařila.") });
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm font-semibold">Připsat / odebrat kredity</p>
        {u.workspaces.length > 1 && (
          <label className="block text-sm">
            Prostor{" "}
            <select className="input" value={ws} onChange={(e) => setWs(e.target.value)}>
              {u.workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <NumberInput label="Počet kreditů (záporné číslo = odebrat)" value={delta} onChange={setDelta} />
        <TextInput label="Poznámka (uvidí ji uživatel v pohybech kreditů)" value={note} onChange={setNote} maxLength={200} />
        <button className="btn btn-primary" disabled={busy || !delta || !ws}>
          Uložit kredity
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Objednávky a doklady                                               */
/* ------------------------------------------------------------------ */

interface AdminOrder {
  id: string;
  number: string;
  productName: string;
  amountHaler: number;
  status: string;
  paymentMethod: string;
  variableSymbol: string | null;
  email: string;
  userName: string;
  createdAt: string;
  paidAt: string | null;
  invoices: { id: string; number: string }[];
}

interface AdminInvoice {
  id: string;
  number: string;
  issuedAt: string;
  paidAt: string;
  totalHaler: number;
  paymentMethod: string;
  variableSymbol: string | null;
  canceledAt: string | null;
  customer: { name?: string; company?: string; email?: string; ico?: string };
}

const ORDER_STATUS: Record<string, string> = { PENDING: "čeká na platbu", PAID: "zaplaceno", CANCELED: "zrušeno", FAILED: "chyba", REFUNDED: "vráceno" };

export function AdminOrders() {
  const [tab, setTab] = useState<"orders" | "invoices">("orders");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [invoices, setInvoices] = useState<AdminInvoice[] | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [msg, setMsg] = useState<Msg>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("stav");
    if (s) setStatus(s);
  }, []);

  const loadOrders = useCallback(
    () =>
      api<{ orders: AdminOrder[] }>(`/api/admin/orders?status=${status}&method=${method}&q=${encodeURIComponent(q)}`)
        .then((r) => setOrders(r.orders))
        .catch((e) => setMsg({ tone: "error", text: errText(e, "Objednávky se nepodařilo načíst.") })),
    [status, method, q],
  );
  const loadInvoices = useCallback(
    () =>
      api<{ invoices: AdminInvoice[] }>(`/api/admin/invoices?year=${year}`)
        .then((r) => setInvoices(r.invoices))
        .catch((e) => setMsg({ tone: "error", text: errText(e, "Doklady se nepodařilo načíst.") })),
    [year],
  );
  useEffect(() => {
    if (tab !== "orders") return;
    const t = setTimeout(loadOrders, 250);
    return () => clearTimeout(t);
  }, [tab, loadOrders]);
  useEffect(() => {
    if (tab === "invoices") loadInvoices();
  }, [tab, loadInvoices]);

  const orderAction = async (o: AdminOrder, action: "confirm" | "cancel") => {
    const text =
      action === "confirm"
        ? `Potvrdit přijetí ${czk(o.amountHaler)} (VS ${o.variableSymbol}) k ${new Date(paidAt).toLocaleDateString("cs-CZ")}? Připíše se kredit, odemkne analýza a odešle doklad.`
        : `Zrušit objednávku ${o.number}?`;
    if (!window.confirm(text)) return;
    try {
      await api(`/api/admin/orders/${o.id}`, { body: { action, paidAt: action === "confirm" ? paidAt : undefined } });
      setMsg({ tone: "ok", text: action === "confirm" ? `Platba ${o.number} potvrzena, doklad vystaven.` : `Objednávka ${o.number} zrušena.` });
      await loadOrders();
    } catch (e) {
      setMsg({ tone: "error", text: errText(e, "Akce se nezdařila.") });
    }
  };

  return (
    <div className="space-y-4">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="flex gap-1">
        <button className={`btn ${tab === "orders" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("orders")}>
          Objednávky
        </button>
        <button className={`btn ${tab === "invoices" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("invoices")}>
          Doklady (faktury)
        </button>
      </div>

      {tab === "orders" ? (
        <>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label>
              Stav{" "}
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">vše</option>
                {Object.entries(ORDER_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Platba{" "}
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">vše</option>
                <option value="CARD">kartou</option>
                <option value="BANK">převodem</option>
              </select>
            </label>
            <div className="w-64">
              <TextInput label="Hledat (číslo, VS, e-mail)" value={q} onChange={setQ} />
            </div>
            <label>
              Datum přijetí platby{" "}
              <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </label>
          </div>
          {!orders ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <p className="text-ink-soft">Žádné objednávky.</p>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="px-3 py-2">Číslo / VS</th>
                    <th className="px-3 py-2">Zákazník</th>
                    <th className="px-3 py-2">Produkt</th>
                    <th className="px-3 py-2 text-right">Částka</th>
                    <th className="px-3 py-2">Stav</th>
                    <th className="px-3 py-2">Vytvořeno / zaplaceno</th>
                    <th className="px-3 py-2">Doklad</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-line-soft align-top">
                      <td className="px-3 py-2 font-mono text-xs">
                        {o.number}
                        {o.variableSymbol && (
                          <>
                            <br />
                            VS {o.variableSymbol}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {o.userName}
                        <br />
                        {o.email}
                      </td>
                      <td className="px-3 py-2">{o.productName}</td>
                      <td className="px-3 py-2 text-right">{czk(o.amountHaler)}</td>
                      <td className="px-3 py-2">
                        {ORDER_STATUS[o.status] ?? o.status}
                        <span className="block text-xs text-muted">{o.paymentMethod === "BANK" ? "převodem" : "kartou"}</span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {dt(o.createdAt)}
                        <br />
                        {dt(o.paidAt)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {o.invoices.map((i) => (
                          <a key={i.id} className="link block" href={`/api/invoices/${i.id}`} target="_blank" rel="noopener">
                            {i.number}
                          </a>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {o.paymentMethod === "BANK" && (o.status === "PENDING" || o.status === "CANCELED") && (
                          <button className="btn btn-primary px-2 py-1 text-xs" onClick={() => orderAction(o, "confirm")}>
                            Platba přijata
                          </button>
                        )}
                        {o.status === "PENDING" && (
                          <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => orderAction(o, "cancel")}>
                            Zrušit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted">
            Platba převodem: po připsání na účet zkontrolujte částku a variabilní symbol a klikněte na „Platba přijata“. Aplikace připíše kredit, odemkne analýzu,
            vystaví doklad a pošle ho zákazníkovi e-mailem. Platby kartou se potvrzují automaticky přes GoPay.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label>
              Rok{" "}
              <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <a className="btn btn-secondary" href={`/api/admin/invoices?year=${year}&format=csv`}>
              Stáhnout knihu dokladů (CSV pro Excel)
            </a>
          </div>
          {!invoices ? (
            <Spinner />
          ) : invoices.length === 0 ? (
            <p className="text-ink-soft">V roce {year} zatím nebyly vystaveny žádné doklady.</p>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="px-3 py-2">Číslo</th>
                    <th className="px-3 py-2">Odběratel</th>
                    <th className="px-3 py-2">Vystaveno</th>
                    <th className="px-3 py-2">Úhrada</th>
                    <th className="px-3 py-2 text-right">Částka</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className={`border-b border-line-soft ${i.canceledAt ? "text-muted line-through" : ""}`}>
                      <td className="px-3 py-2 font-mono">
                        <a className="link" href={`/api/invoices/${i.id}`} target="_blank" rel="noopener">
                          {i.number}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {i.customer.company || i.customer.name}
                        {i.customer.ico ? `, IČO ${i.customer.ico}` : ""}
                        <br />
                        {i.customer.email}
                      </td>
                      <td className="px-3 py-2">{new Date(i.issuedAt).toLocaleDateString("cs-CZ")}</td>
                      <td className="px-3 py-2">{i.paymentMethod === "BANK" ? "převod" : "karta"}</td>
                      <td className="px-3 py-2 text-right">{czk(i.totalHaler)}</td>
                      <td className="px-3 py-2 text-right no-underline">
                        <button
                          className="btn btn-ghost px-2 py-1 text-xs"
                          onClick={async () => {
                            if (!window.confirm(i.canceledAt ? `Obnovit doklad ${i.number}?` : `Stornovat doklad ${i.number}? (např. po vrácení platby)`)) return;
                            try {
                              await api(`/api/admin/invoices/${i.id}`, { method: "PATCH", body: { canceled: !i.canceledAt } });
                              await loadInvoices();
                            } catch (e) {
                              setMsg({ tone: "error", text: errText(e, "Akce se nezdařila.") });
                            }
                          }}
                        >
                          {i.canceledAt ? "Obnovit" : "Stornovat"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Texty webu                                                         */
/* ------------------------------------------------------------------ */

export function AdminTexts() {
  const [stored, setStored] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ storedTexts: Record<string, string> }>("/api/admin/settings")
      .then((r) => setStored(r.storedTexts))
      .catch((e) => setMsg({ tone: "error", text: errText(e, "Texty se nepodařilo načíst.") }));
  }, []);
  if (!stored) return <Spinner />;
  const keys = Object.keys(SITE_TEXTS) as SiteTextKey[];
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/admin/settings", { method: "PUT", body: { texts: stored } });
          setMsg({ tone: "ok", text: "Texty uloženy. Na webu se projeví do 30 sekund." });
        } catch (err) {
          setMsg({ tone: "error", text: errText(err, "Uložení se nezdařilo.") });
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-ink-soft">
        Prázdné pole = použije se výchozí text (zobrazen šedě jako nápověda). Obchodní podmínky a další právní texty jsou součástí kódu – změny v nich doporučujeme
        konzultovat s právníkem.
      </p>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {keys.map((k) => {
        const def = SITE_TEXTS[k];
        return (
          <div key={k} className="panel p-4">
            <TextArea
              label={def.label}
              help={`${def.where}. Výchozí: ${def.default || "(nic)"}`}
              rows={"multiline" in def && def.multiline ? 4 : 2}
              value={stored[k] ?? ""}
              onChange={(v) => setStored({ ...stored, [k]: v })}
            />
            {stored[k] && (
              <button type="button" className="link mt-1 text-xs" onClick={() => setStored({ ...stored, [k]: "" })}>
                Vrátit výchozí text
              </button>
            )}
          </div>
        );
      })}
      <div className="sticky bottom-0 border-t border-line bg-paper py-3">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Ukládám…" : "Uložit texty"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Provozovatel, bankovní účet, doklady                               */
/* ------------------------------------------------------------------ */

interface SettingsDto {
  operator: { name: string; ico: string; dic: string; address: string; email: string; phone: string; registry: string; vatPayer: boolean };
  bank: { enabled: boolean; account: string; dueDays: number; iban: string; accountValid: boolean };
  invoice: { note: string };
}

export function AdminSettings() {
  const [s, setS] = useState<SettingsDto | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ settings: SettingsDto }>("/api/admin/settings")
      .then((r) => setS(r.settings))
      .catch((e) => setMsg({ tone: "error", text: errText(e, "Nastavení se nepodařilo načíst.") }));
  }, []);
  if (!s) return <Spinner />;
  const op = s.operator;
  const setOp = (patch: Partial<SettingsDto["operator"]>) => setS({ ...s, operator: { ...op, ...patch } });
  const setBank = (patch: Partial<SettingsDto["bank"]>) => setS({ ...s, bank: { ...s.bank, ...patch } });
  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          const r = await api<{ settings: SettingsDto }>("/api/admin/settings", {
            method: "PUT",
            body: {
              operator: op,
              bank: { enabled: s.bank.enabled, account: s.bank.account, dueDays: s.bank.dueDays },
              invoice: s.invoice,
            },
          });
          setS(r.settings);
          setMsg({ tone: "ok", text: "Nastavení uloženo." });
        } catch (err) {
          if (err instanceof ApiError && Array.isArray(err.details)) {
            setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
          }
          setMsg({ tone: "error", text: errText(err, "Uložení se nezdařilo.") });
        } finally {
          setBusy(false);
        }
      }}
    >
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <section className="panel grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-lg sm:col-span-2">Provozovatel (patička, Kontakty, obchodní podmínky, doklady)</h2>
        <TextInput label="Jméno / obchodní firma" value={op.name} onChange={(v) => setOp({ name: v })} error={errors["operator.name"]} />
        <TextInput label="IČO" value={op.ico} onChange={(v) => setOp({ ico: v })} error={errors["operator.ico"]} maxLength={8} />
        <TextInput label="DIČ (jen plátce DPH)" value={op.dic} onChange={(v) => setOp({ dic: v })} />
        <TextInput label="Sídlo / místo podnikání" value={op.address} onChange={(v) => setOp({ address: v })} help="Ulice a číslo, PSČ, obec – povinný údaj na dokladech." />
        <TextInput label="Kontaktní e-mail" type="email" value={op.email} onChange={(v) => setOp({ email: v })} error={errors["operator.email"]} />
        <TextInput label="Telefon" value={op.phone} onChange={(v) => setOp({ phone: v })} help="GoPay vyžaduje telefon v kontaktech webu." />
        <div className="sm:col-span-2">
          <TextInput label="Údaj o zápisu (na dokladu)" value={op.registry} onChange={(v) => setOp({ registry: v })} />
        </div>
        <Checkbox label="Jsem plátce DPH" checked={op.vatPayer} onChange={(v) => setOp({ vatPayer: v })} help="Ovlivní texty o cenách a hlavičku dokladu." />
      </section>

      <section className="panel grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-lg sm:col-span-2">Platba bankovním převodem</h2>
        <Checkbox label="Nabízet platbu převodem" checked={s.bank.enabled} onChange={(v) => setBank({ enabled: v })} />
        <div />
        <TextInput
          label="Číslo účtu"
          value={s.bank.account}
          onChange={(v) => setBank({ account: v })}
          error={errors["bank.account"]}
          help={s.bank.accountValid ? `IBAN ${s.bank.iban}` : "Ve tvaru 123456789/0300 nebo 19-123456789/0800"}
        />
        <NumberInput label="Splatnost" unit="dní" value={s.bank.dueDays} onChange={(v) => setBank({ dueDays: v ?? 7 })} />
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-lg">Doklady</h2>
        <p className="text-sm text-ink-soft">
          Doklady se vystavují automaticky po každé přijaté platbě (karta, převod, obnova předplatného) s číslem RRRRNNNN. U neplátce DPH se doplní věta „Dodavatel
          není plátcem DPH.“
        </p>
        <TextArea label="Doplňující poznámka na dokladu" value={s.invoice.note} onChange={(v) => setS({ ...s, invoice: { note: v } })} rows={2} />
      </section>

      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Ukládám…" : "Uložit nastavení"}
      </button>
    </form>
  );
}
