/**
 * Kredity, předplatné a odemykání projektů.
 *
 * Obchodní pravidla (viz docs/architecture.md, kap. 3.4):
 * - Odemčení projektu je jednorázové a trvalé; spotřebuje 1 kredit nebo jde z aktivního předplatného.
 * - Dvojímu odečtu brání unikátní klíč `unlock:<projectId>` a unikátní projectId v project_unlocks.
 * - Souběžná odemčení v jednom workspace serializuje advisory lock.
 */
import { and, asc, count, eq, gt, gte, inArray, isNull, sql, sum } from "drizzle-orm";
import { DEFAULT_PRODUCTS } from "@/config/pricing";
import { getVerificationSummary } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";
import { audit } from "../audit";
import { getConfig } from "../config";
import { getDb, type Tx } from "../db";
import { creditLedger, products, projects, projectUnlocks, subscriptions } from "../db/schema";
import { forbidden, notFound, paymentRequired } from "../http";

export type ProductRow = typeof products.$inferSelect;

export async function listProducts(activeOnly = true): Promise<ProductRow[]> {
  const db = getDb();
  return db
    .select()
    .from(products)
    .where(activeOnly ? eq(products.active, true) : undefined)
    .orderBy(asc(products.sortOrder));
}

export async function getProduct(code: string): Promise<ProductRow | null> {
  return (await getDb().query.products.findFirst({ where: eq(products.code, code) })) ?? null;
}

/** Vloží chybějící produkty z výchozího ceníku. `force` přepíše i existující ceny. */
export async function seedProducts(force = false) {
  const db = getDb();
  for (const p of DEFAULT_PRODUCTS) {
    const values = {
      code: p.code,
      name: p.name,
      description: p.description,
      type: p.type,
      priceHaler: Math.round(p.priceCzk * 100),
      credits: p.credits ?? null,
      periodMonths: p.periodMonths ?? null,
      unlocksPerPeriod: p.unlocksPerPeriod ?? null,
      maxMembers: p.maxMembers,
      features: p.features,
      sortOrder: p.sortOrder,
    };
    if (force) {
      await db.insert(products).values(values).onConflictDoUpdate({ target: products.code, set: values });
    } else {
      await db.insert(products).values(values).onConflictDoNothing();
    }
  }
}

/** Je výpočetní jádro odborně ověřeno, nebo je kontrola v konfiguraci vypnuta? */
export function commerceAllowed(): { allowed: boolean; reason?: string } {
  const c = getConfig();
  if (!c.REQUIRE_VERIFIED_CORE) return { allowed: true };
  const v = getVerificationSummary();
  if (v.fullyVerified) return { allowed: true };
  return {
    allowed: false,
    reason: `Placené exporty jsou dočasně nedostupné: výpočetní jádro čeká na nezávislé odborné ověření (ověřeno ${v.verified} z ${v.total} položek).`,
  };
}

export async function creditBalance(workspaceId: string, tx?: Tx): Promise<number> {
  const [row] = await (tx ?? getDb())
    .select({ total: sum(creditLedger.delta) })
    .from(creditLedger)
    .where(eq(creditLedger.workspaceId, workspaceId));
  return Number(row?.total ?? 0);
}

/** Přičte kredity – idempotentně podle klíče. Vrací true, pokud byl zápis nově vytvořen. */
export async function grantCredits(
  tx: Tx,
  p: { workspaceId: string; amount: number; key: string; orderId?: string; paymentId?: string; note?: string; reason?: "PURCHASE" | "ADJUSTMENT" | "REFUND" },
): Promise<boolean> {
  const rows = await tx
    .insert(creditLedger)
    .values({
      workspaceId: p.workspaceId,
      delta: p.amount,
      reason: p.reason ?? "PURCHASE",
      idempotencyKey: p.key,
      orderId: p.orderId ?? null,
      paymentId: p.paymentId ?? null,
      note: p.note ?? null,
    })
    .onConflictDoNothing({ target: creditLedger.idempotencyKey })
    .returning({ id: creditLedger.id });
  return rows.length > 0;
}

export interface ActiveSubscription {
  subscription: typeof subscriptions.$inferSelect;
  product: ProductRow;
}

export async function activeSubscription(workspaceId: string, now = new Date(), tx?: Tx): Promise<ActiveSubscription | null> {
  const db = tx ?? getDb();
  const rows = await db
    .select({ subscription: subscriptions, product: products })
    .from(subscriptions)
    .innerJoin(products, eq(subscriptions.productCode, products.code))
    .where(
      and(
        eq(subscriptions.workspaceId, workspaceId),
        inArray(subscriptions.status, ["ACTIVE", "CANCELED"]),
        gt(subscriptions.currentPeriodEnd, now),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function addMonthsUtc(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/**
 * Začátek aktuálního zúčtovacího období. `currentPeriodStart` je kotva (datum aktivace),
 * období se počítají po `periodMonths` od kotvy. Obnovy prodlužují jen `currentPeriodEnd`.
 */
export function periodStartFor(anchor: Date, periodMonths: number, now = new Date()): Date {
  let k = 0;
  let start = anchor;
  // bezpečně max. 1200 období (100 let měsíčně)
  while (k < 1200) {
    const next = addMonthsUtc(anchor, (k + 1) * periodMonths);
    if (next > now) break;
    start = next;
    k++;
  }
  return start;
}

export async function subscriptionUnlocksUsed(sub: ActiveSubscription, tx?: Tx, now = new Date()): Promise<number> {
  const anchor = sub.subscription.currentPeriodStart ?? new Date(0);
  const windowStart = periodStartFor(anchor, sub.product.periodMonths ?? 1, now);
  const [row] = await (tx ?? getDb())
    .select({ n: count() })
    .from(projectUnlocks)
    .where(and(eq(projectUnlocks.subscriptionId, sub.subscription.id), gte(projectUnlocks.createdAt, windowStart)));
  return row?.n ?? 0;
}

/**
 * Odemkne export projektu v rámci existující transakce.
 * Idempotentní: opakované volání pro stejný projekt nic neodečte.
 */
export async function unlockProjectTx(
  tx: Tx,
  p: { workspaceId: string; projectId: string; userId: string },
): Promise<typeof projectUnlocks.$inferSelect> {
  // serializace odemykání v rámci workspace
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"unlock:" + p.workspaceId}))`);

  const existing = await tx.query.projectUnlocks.findFirst({ where: eq(projectUnlocks.projectId, p.projectId) });
  if (existing) {
    if (existing.workspaceId !== p.workspaceId) throw notFound("Projekt nebyl nalezen.");
    return existing;
  }
  const project = await tx.query.projects.findFirst({
    where: and(eq(projects.id, p.projectId), eq(projects.workspaceId, p.workspaceId), isNull(projects.deletedAt)),
  });
  if (!project) throw notFound("Projekt nebyl nalezen.");

  const sub = await activeSubscription(p.workspaceId, new Date(), tx);
  let unlock: typeof projectUnlocks.$inferSelect | undefined;
  if (sub) {
    const used = await subscriptionUnlocksUsed(sub, tx);
    const limit = sub.product.unlocksPerPeriod;
    if (limit == null || used < limit) {
      [unlock] = await tx
        .insert(projectUnlocks)
        .values({
          projectId: p.projectId,
          workspaceId: p.workspaceId,
          source: "SUBSCRIPTION",
          subscriptionId: sub.subscription.id,
          userId: p.userId,
        })
        .returning();
    }
  }
  if (!unlock) {
    const balance = await creditBalance(p.workspaceId, tx);
    if (balance < 1) {
      throw paymentRequired(
        sub
          ? "Limit analýz v aktuálním období předplatného je vyčerpán a nemáte žádný kredit."
          : "Pro stažení dokumentace je potřeba zakoupit analýzu, balíček nebo předplatné.",
      );
    }
    const [entry] = await tx
      .insert(creditLedger)
      .values({
        workspaceId: p.workspaceId,
        delta: -1,
        reason: "UNLOCK",
        idempotencyKey: `unlock:${p.projectId}`,
        projectId: p.projectId,
      })
      .returning();
    [unlock] = await tx
      .insert(projectUnlocks)
      .values({
        projectId: p.projectId,
        workspaceId: p.workspaceId,
        source: "CREDIT",
        ledgerEntryId: entry.id,
        userId: p.userId,
      })
      .returning();
  }
  // po odemčení se zamyká identifikace objektu
  await tx.update(projects).set({ objectLockedAt: new Date() }).where(eq(projects.id, p.projectId));
  await audit("project.unlock", { userId: p.userId, workspaceId: p.workspaceId, meta: { projectId: p.projectId, source: unlock.source } }, tx);
  return unlock;
}

export async function unlockProject(p: { workspaceId: string; projectId: string; userId: string }) {
  const gate = commerceAllowed();
  if (!gate.allowed) throw forbidden(gate.reason);
  return getDb().transaction((tx) => unlockProjectTx(tx, p));
}

export async function getUnlock(projectId: string) {
  return (await getDb().query.projectUnlocks.findFirst({ where: eq(projectUnlocks.projectId, projectId) })) ?? null;
}

export async function ledgerHistory(workspaceId: string) {
  return getDb().query.creditLedger.findMany({
    where: eq(creditLedger.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 200,
  });
}
