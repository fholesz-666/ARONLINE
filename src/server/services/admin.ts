/**
 * Správa služby: uživatelé, kredity, objednávky, doklady a přehled.
 * Všechny funkce volat jen po requireAdmin().
 */
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, ilike, inArray, isNull, or, sql, sum } from "drizzle-orm";
import { audit } from "../audit";
import { getDb } from "../db";
import { creditLedger, invoices, memberships, orders, projects, sessions, subscriptions, users, workspaces } from "../db/schema";
import { badRequest, notFound } from "../http";
import { GUEST_EMAIL_DOMAIN } from "./auth";
import { grantCredits } from "./billing";

export async function adminOverview() {
  const db = getDb();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [[u], [g], [paid], [pending], [inv], [subs], [proj]] = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.isGuest, false)),
    db.select({ n: count() }).from(users).where(eq(users.isGuest, true)),
    db.select({ n: count(), total: sum(orders.amountHaler) }).from(orders).where(and(eq(orders.status, "PAID"), gte(orders.paidAt, monthStart))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.status, "PENDING"), eq(orders.paymentMethod, "BANK"))),
    db.select({ n: count(), total: sum(invoices.totalHaler) }).from(invoices).where(and(gte(invoices.issuedAt, monthStart), isNull(invoices.canceledAt))),
    db.select({ n: count() }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE")),
    db.select({ n: count() }).from(projects).where(isNull(projects.deletedAt)),
  ]);
  return {
    users: u.n,
    guests: g.n,
    projects: proj.n,
    activeSubscriptions: subs.n,
    paidOrdersThisMonth: paid.n,
    invoicedThisMonthHaler: Number(inv.total ?? 0),
    invoicesThisMonth: inv.n,
    pendingBankOrders: pending.n,
  };
}

export async function listUsers(p: { q?: string; includeGuests?: boolean; limit?: number; offset?: number }) {
  const db = getDb();
  const q = p.q?.trim();
  const where = and(
    p.includeGuests ? undefined : eq(users.isGuest, false),
    q ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)) : undefined,
  );
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isGuest: users.isGuest,
      emailVerifiedAt: users.emailVerifiedAt,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(Math.min(p.limit ?? 50, 200))
    .offset(p.offset ?? 0);
  const [{ n: total }] = await db.select({ n: count() }).from(users).where(where);
  if (rows.length === 0) return { users: [], total };

  const ids = rows.map((r) => r.id);
  const ms = await db
    .select({ userId: memberships.userId, role: memberships.role, workspaceId: workspaces.id, workspaceName: workspaces.name, type: workspaces.type })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(inArray(memberships.userId, ids));
  const wsIds = [...new Set(ms.map((m) => m.workspaceId))];
  const balances = wsIds.length
    ? await db.select({ ws: creditLedger.workspaceId, total: sum(creditLedger.delta) }).from(creditLedger).where(inArray(creditLedger.workspaceId, wsIds)).groupBy(creditLedger.workspaceId)
    : [];
  const projectCounts = wsIds.length
    ? await db.select({ ws: projects.workspaceId, n: count() }).from(projects).where(and(inArray(projects.workspaceId, wsIds), isNull(projects.deletedAt))).groupBy(projects.workspaceId)
    : [];
  const activeSubs = wsIds.length
    ? await db
        .select({ ws: subscriptions.workspaceId, code: subscriptions.productCode, end: subscriptions.currentPeriodEnd, status: subscriptions.status })
        .from(subscriptions)
        .where(and(inArray(subscriptions.workspaceId, wsIds), inArray(subscriptions.status, ["ACTIVE", "CANCELED"]), gte(subscriptions.currentPeriodEnd, new Date())))
    : [];
  const lastSeen = await db
    .select({ userId: sessions.userId, at: sql<Date>`max(${sessions.lastSeenAt})` })
    .from(sessions)
    .where(inArray(sessions.userId, ids))
    .groupBy(sessions.userId);
  const bal = new Map(balances.map((b) => [b.ws, Number(b.total ?? 0)]));
  const pc = new Map(projectCounts.map((b) => [b.ws, b.n]));
  const subMap = new Map(activeSubs.map((s) => [s.ws, s]));
  const seen = new Map(lastSeen.map((l) => [l.userId, l.at]));

  return {
    total,
    users: rows.map((r) => ({
      ...r,
      email: r.isGuest ? `host (${r.email.replace("@" + GUEST_EMAIL_DOMAIN, "").slice(0, 8)}…)` : r.email,
      emailVerified: r.emailVerifiedAt != null,
      lastSeenAt: seen.get(r.id) ?? null,
      workspaces: ms
        .filter((m) => m.userId === r.id)
        .map((m) => ({
          id: m.workspaceId,
          name: m.workspaceName,
          type: m.type,
          role: m.role,
          balance: bal.get(m.workspaceId) ?? 0,
          projects: pc.get(m.workspaceId) ?? 0,
          subscription: subMap.get(m.workspaceId) ?? null,
        })),
    })),
  };
}

export type UserAction = "disable" | "enable" | "verify" | "make_admin" | "make_user";

export async function updateUser(targetId: string, action: UserAction, adminId: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, targetId) });
  if (!user) throw notFound("Uživatel nebyl nalezen.");
  if (targetId === adminId && (action === "disable" || action === "make_user")) {
    throw badRequest("Vlastní účet správce nelze zablokovat ani mu odebrat roli.");
  }
  switch (action) {
    case "disable":
      await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, targetId));
      await db.delete(sessions).where(eq(sessions.userId, targetId));
      break;
    case "enable":
      await db.update(users).set({ disabledAt: null }).where(eq(users.id, targetId));
      break;
    case "verify":
      await db.update(users).set({ emailVerifiedAt: user.emailVerifiedAt ?? new Date() }).where(eq(users.id, targetId));
      break;
    case "make_admin":
      if (user.isGuest) throw badRequest("Host nemůže být správcem.");
      await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, targetId));
      break;
    case "make_user":
      await db.update(users).set({ role: "USER" }).where(eq(users.id, targetId));
      break;
  }
  await audit(`admin.user_${action}`, { userId: adminId, meta: { target: targetId } });
}

/** Ruční připsání / odečtení kreditů (záznam ADJUSTMENT v kreditní knize). */
export async function adjustCredits(p: { workspaceId: string; delta: number; note: string; adminId: string }) {
  if (!Number.isInteger(p.delta) || p.delta === 0) throw badRequest("Zadejte nenulový celý počet kreditů.");
  const db = getDb();
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, p.workspaceId) });
  if (!ws) throw notFound("Pracovní prostor nebyl nalezen.");
  await db.transaction((tx) =>
    grantCredits(tx, {
      workspaceId: p.workspaceId,
      amount: p.delta,
      key: `admin:${randomUUID()}`,
      reason: "ADJUSTMENT",
      note: p.note.trim().slice(0, 200) || "Úprava správcem",
    }),
  );
  await audit("admin.credits_adjusted", { userId: p.adminId, workspaceId: p.workspaceId, meta: { delta: p.delta } });
}

export async function listAllOrders(p: { status?: string; method?: string; q?: string; limit?: number }) {
  const db = getDb();
  const q = p.q?.trim();
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      productSnapshot: orders.productSnapshot,
      amountHaler: orders.amountHaler,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      variableSymbol: orders.variableSymbol,
      billing: orders.billing,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      userEmail: users.email,
      userName: users.name,
      isGuest: users.isGuest,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(
      and(
        p.status ? eq(orders.status, p.status as "PENDING") : undefined,
        p.method ? eq(orders.paymentMethod, p.method) : undefined,
        q ? or(ilike(orders.number, `%${q}%`), ilike(orders.variableSymbol, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(Math.min(p.limit ?? 100, 500));
  const ids = rows.map((r) => r.id);
  const invs = ids.length
    ? await db.select({ id: invoices.id, orderId: invoices.orderId, number: invoices.number }).from(invoices).where(inArray(invoices.orderId, ids))
    : [];
  return rows.map((r) => ({
    ...r,
    productName: (r.productSnapshot as { name: string }).name,
    email: (r.billing as { email?: string } | null)?.email || (r.isGuest ? "" : r.userEmail),
    invoices: invs.filter((i) => i.orderId === r.id).map((i) => ({ id: i.id, number: i.number })),
  }));
}

export async function listAllInvoices(p: { year?: number }) {
  const db = getDb();
  return db.query.invoices.findMany({
    where: p.year ? eq(invoices.year, p.year) : undefined,
    orderBy: (t) => [desc(t.year), desc(t.seq)],
    limit: 2000,
  });
}

export async function setInvoiceCanceled(invoiceId: string, canceled: boolean, adminId: string) {
  const db = getDb();
  const [row] = await db.update(invoices).set({ canceledAt: canceled ? new Date() : null }).where(eq(invoices.id, invoiceId)).returning();
  if (!row) throw notFound("Doklad nebyl nalezen.");
  await audit(canceled ? "admin.invoice_canceled" : "admin.invoice_restored", { userId: adminId, meta: { number: row.number } });
}

/** CSV knihy dokladů pro daňovou evidenci (oddělovač ;, UTF-8 s BOM pro Excel). */
export function invoicesCsv(rows: Awaited<ReturnType<typeof listAllInvoices>>): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["Číslo", "Vystaveno", "Uhrazeno", "Odběratel", "IČO odběratele", "E-mail", "Položka", "Částka Kč", "Způsob úhrady", "VS", "Stornováno"];
  const lines = rows.map((r) => {
    const c = r.customer as { name?: string; company?: string; ico?: string; email?: string };
    const items = r.items as { name: string }[];
    return [
      r.number,
      new Date(r.issuedAt).toLocaleDateString("cs-CZ"),
      new Date(r.paidAt).toLocaleDateString("cs-CZ"),
      c.company || c.name || "",
      c.ico ?? "",
      c.email ?? "",
      items.map((i) => i.name).join(", "),
      (r.totalHaler / 100).toFixed(2).replace(".", ","),
      r.paymentMethod === "BANK" ? "převod" : "karta",
      r.variableSymbol ?? "",
      r.canceledAt ? "ano" : "",
    ]
      .map(esc)
      .join(";");
  });
  return "﻿" + [head.join(";"), ...lines].join("\r\n");
}
