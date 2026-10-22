/**
 * Doklady o zaplacení (faktury) – vystavují se automaticky při potvrzení platby.
 *
 * - Číselná řada po letech: RRRRNNNN (např. 20260001), bez mezer v řadě (čítač v transakci).
 * - Každá přijatá platba má nejvýše jeden doklad (unikátní payment_id) → opakované notifikace nevystaví duplicitu.
 * - Údaje dodavatele i odběratele se ukládají jako snímek k datu vystavení.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, type Tx } from "../db";
import { invoiceCounters, invoices, memberships, processorProfiles, users, type orders, type payments } from "../db/schema";
import { forbidden, notFound } from "../http";
import { getSettings } from "./settings";

export interface InvoiceParty {
  name: string;
  company?: string;
  ico?: string;
  dic?: string;
  address?: string;
  email?: string;
  phone?: string;
  registry?: string;
  vatPayer?: boolean;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitHaler: number;
  totalHaler: number;
}

export type InvoiceRow = typeof invoices.$inferSelect;

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CARD: "platební kartou online (GoPay)",
  BANK: "bankovním převodem",
};

/** Fakturační údaje odběratele: výchozí profil zpracovatele v prostoru, jinak jméno a e-mail účtu. */
export async function billingSnapshot(workspaceId: string, userId: string, email: string): Promise<InvoiceParty> {
  const db = getDb();
  const profile = await db.query.processorProfiles.findFirst({
    where: eq(processorProfiles.workspaceId, workspaceId),
    orderBy: (t, { desc: d }) => [d(t.isDefault), d(t.updatedAt)],
    columns: { data: true },
  });
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { name: true } });
  const p = (profile?.data ?? {}) as Partial<Record<"fullName" | "company" | "ico" | "dic" | "address" | "phone", string>>;
  return {
    name: p.fullName || user?.name || email,
    company: p.company || undefined,
    ico: p.ico || undefined,
    dic: p.dic || undefined,
    address: p.address || undefined,
    email,
  };
}

async function nextNumber(tx: Tx, year: number): Promise<{ seq: number; number: string }> {
  const rows = await tx
    .insert(invoiceCounters)
    .values({ year, last: 1 })
    .onConflictDoUpdate({ target: invoiceCounters.year, set: { last: sql`${invoiceCounters.last} + 1` } })
    .returning({ last: invoiceCounters.last });
  const seq = rows[0].last;
  return { seq, number: `${year}${String(seq).padStart(4, "0")}` };
}

const dateCz = (d: Date) => d.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });

/**
 * Vystaví doklad k zaplacené platbě (v rámci transakce, která platbu potvrzuje).
 * Idempotentní – pro již dokladovanou platbu vrátí existující doklad.
 */
export async function issueInvoiceTx(
  tx: Tx,
  p: {
    order: typeof orders.$inferSelect;
    payment: typeof payments.$inferSelect;
    paidAt: Date;
    period?: { from: Date; to: Date };
  },
): Promise<InvoiceRow> {
  const existing = await tx.query.invoices.findFirst({ where: eq(invoices.paymentId, p.payment.id) });
  if (existing) return existing;

  const settings = await getSettings();
  const op = settings.operator;
  const snap = p.order.productSnapshot as { name: string; type: string; credits?: number | null };
  const year = Number(p.paidAt.toLocaleString("en-US", { timeZone: "Europe/Prague", year: "numeric" }));
  const { seq, number } = await nextNumber(tx, year);

  const billing = (p.order.billing ?? {}) as InvoiceParty;
  const customer: InvoiceParty = billing.name ? billing : { name: billing.email ?? "Zákazník", email: billing.email };
  let itemName = `${snap.name} – ARONLINE`;
  if (snap.type === "SUBSCRIPTION" && p.period) itemName = `${snap.name} – ARONLINE, období ${dateCz(p.period.from)} – ${dateCz(p.period.to)}`;
  else if (snap.credits && snap.credits > 1) itemName = `${snap.name} – ARONLINE (${snap.credits} analýz)`;
  const amount = p.payment.amountHaler;
  const items: InvoiceItem[] = [{ name: itemName, quantity: 1, unit: "ks", unitHaler: amount, totalHaler: amount }];

  const noteParts = [op.vatPayer ? "" : "Dodavatel není plátcem DPH.", settings.invoice.note].filter(Boolean);
  const [row] = await tx
    .insert(invoices)
    .values({
      number,
      year,
      seq,
      orderId: p.order.id,
      paymentId: p.payment.id,
      workspaceId: p.order.workspaceId,
      userId: p.order.userId,
      paidAt: p.paidAt,
      supplier: {
        name: op.name,
        ico: op.ico,
        dic: op.dic || undefined,
        address: op.address,
        email: op.email,
        phone: op.phone || undefined,
        registry: op.registry,
        vatPayer: op.vatPayer,
      } satisfies InvoiceParty,
      customer,
      items,
      totalHaler: amount,
      paymentMethod: p.order.paymentMethod,
      variableSymbol: p.order.variableSymbol ?? number,
      note: noteParts.join(" ") || null,
    })
    .returning();
  return row;
}

export async function listInvoices(workspaceId: string) {
  return getDb().query.invoices.findMany({
    where: eq(invoices.workspaceId, workspaceId),
    orderBy: (t) => [desc(t.issuedAt)],
    limit: 200,
  });
}

/** Doklad smí stáhnout člen prostoru, ve kterém vznikl, nebo správce. */
export async function getInvoiceFor(invoiceId: string, viewer: { userId: string; isAdmin: boolean }): Promise<InvoiceRow> {
  const db = getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv) throw notFound("Doklad nebyl nalezen.");
  if (viewer.isAdmin) return inv;
  const m = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, viewer.userId), eq(memberships.workspaceId, inv.workspaceId)),
  });
  if (!m) throw forbidden();
  return inv;
}

export function invoiceFileName(inv: InvoiceRow) {
  return `doklad-${inv.number}.pdf`;
}
