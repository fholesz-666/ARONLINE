/**
 * Objednávky a zpracování plateb.
 *
 * Bezpečnostní zásady:
 * - Kredit / předplatné se aplikuje POUZE po stavu PAID zjištěném dotazem na API brány.
 * - Notifikace i návrat z brány jen spouští `syncPayment` – samy nic nepřipisují.
 * - Řádek platby se zamyká (SELECT … FOR UPDATE) a `fulfilledAt` + unikátní klíče v kreditní
 *   knize brání dvojímu připsání při souběžných nebo opakovaných notifikacích.
 * - Kontroluje se shoda částky, měny, čísla objednávky a GoID příjemce.
 */
import { randomInt } from "node:crypto";
import { GUEST_EMAIL_DOMAIN } from "../services/auth";
import { and, eq, inArray } from "drizzle-orm";
import { audit } from "../audit";
import { getConfig } from "../config";
import { getDb, type Tx } from "../db";
import { RECURRENCE_CONSENT, RECURRENCE_TERMS_VERSION, recurrenceDateTo, recurrenceTerms } from "@/config/recurrence";
import { renderInvoicePdf } from "../documents/invoice-pdf";
import { invoices, orders, paymentEvents, payments, subscriptions, users } from "../db/schema";
import { badRequest, conflict, forbidden, notFound } from "../http";
import { errorMeta, log } from "../log";
import { mails, sendMail } from "../mail";
import { activeSubscription, commerceAllowed, getProduct, getUnlock, grantCredits, unlockProjectTx } from "../services/billing";
import { billingSnapshot, invoiceFileName, issueInvoiceTx, type InvoiceParty } from "../services/invoices";
import { getSettings } from "../services/settings";
import { requireProjectAccess } from "../services/workspace";
import { GatewayError, type PaymentGateway, type PaymentStatus } from "./gateway";
import { GoPayGateway } from "./gopay";
import { MOCK_GOID, MockGateway } from "./mock";

let gatewayOverride: PaymentGateway | null = null;
let gopaySingleton: GoPayGateway | null = null;

/** Pro testy: podstrčení brány. */
export function setGatewayForTests(g: PaymentGateway | null) {
  gatewayOverride = g;
}

export function getGateway(): PaymentGateway {
  if (gatewayOverride) return gatewayOverride;
  const c = getConfig();
  if (c.PAYMENTS_MODE === "mock") return new MockGateway(c.APP_URL);
  if (!c.gopayConfigured) throw new GatewayError("Platební brána GoPay není nakonfigurována.");
  gopaySingleton ??= new GoPayGateway({
    goid: c.GOPAY_GOID!,
    clientId: c.GOPAY_CLIENT_ID!,
    clientSecret: c.GOPAY_CLIENT_SECRET!,
    mode: c.PAYMENTS_MODE,
  });
  return gopaySingleton;
}

function expectedGoid(): string {
  const c = getConfig();
  return gatewayOverride?.provider === "MOCK" || c.PAYMENTS_MODE === "mock" ? MOCK_GOID : (c.GOPAY_GOID ?? "");
}

export function paymentsAvailable(): { available: boolean; reason?: string } {
  const gate = commerceAllowed();
  if (!gate.allowed) return { available: false, reason: gate.reason };
  const c = getConfig();
  if (c.PAYMENTS_MODE !== "mock" && !c.gopayConfigured) {
    return { available: false, reason: "Platební brána zatím není nakonfigurována." };
  }
  return { available: true };
}

function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `AR${ymd}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // konec měsíce
  return d;
}

export interface CreateOrderInput {
  workspaceId: string;
  userId: string;
  userEmail: string;
  emailVerified: boolean;
  /** Host bez registrace – smí koupit jen jednorázovou analýzu ke konkrétnímu projektu. */
  isGuest?: boolean;
  productCode: string;
  projectId?: string | null;
  /** Souhlas se založením opakované platby (povinný u předplatného) */
  recurrenceConsent?: boolean;
  /** IP adresa pro doklad o souhlasu */
  clientIp?: string;
}

/** Jediný produkt dostupný bez registrace. */
export const GUEST_PRODUCT_CODE = "SINGLE";

/** Společné kontroly objednávky (karta i převod). */
async function validateOrder(input: CreateOrderInput) {
  if (input.isGuest) {
    if (input.productCode !== GUEST_PRODUCT_CODE) {
      throw forbidden("Balíčky a předplatné vyžadují registraci. Jako host lze zakoupit jen jednorázovou analýzu.");
    }
    if (!input.projectId) throw badRequest("Jednorázová analýza se kupuje ke konkrétnímu projektu.");
    if (!input.userEmail || input.userEmail.endsWith("@" + GUEST_EMAIL_DOMAIN)) {
      throw badRequest("Zadejte e-mail pro doklad o platbě.", [{ path: "email", message: "Zadejte e-mail" }]);
    }
  } else if (!input.emailVerified) {
    throw forbidden("Před platbou prosím potvrďte svůj e-mail (odkaz v registračním e-mailu).");
  }
  const product = await getProduct(input.productCode);
  if (!product || !product.active) throw notFound("Produkt není dostupný.");
  if (product.type === "SUBSCRIPTION") {
    if (await activeSubscription(input.workspaceId)) {
      throw conflict("Pracovní prostor už má aktivní předplatné. Pro změnu tarifu nejprve zrušte stávající předplatné.");
    }
    if (input.projectId) throw badRequest("Předplatné se nekupuje k projektu.");
  }
  if (input.projectId) {
    await requireProjectAccess(input.userId, input.workspaceId, input.projectId);
    if (await getUnlock(input.projectId)) throw conflict("Projekt je již odemčen.");
  }
  return product;
}

function productSnapshot(product: NonNullable<Awaited<ReturnType<typeof getProduct>>>) {
  return {
    code: product.code,
    name: product.name,
    type: product.type,
    priceHaler: product.priceHaler,
    credits: product.credits,
    periodMonths: product.periodMonths,
    unlocksPerPeriod: product.unlocksPerPeriod,
    maxMembers: product.maxMembers,
  };
}

export async function createOrder(input: CreateOrderInput): Promise<{ orderId: string; gwUrl: string }> {
  const avail = paymentsAvailable();
  if (!avail.available) throw forbidden(avail.reason);
  const product = await validateOrder(input);
  const c = getConfig();
  const settings = await getSettings();

  let consents: Record<string, unknown> | null = null;
  if (product.type === "SUBSCRIPTION") {
    if (!c.GOPAY_RECURRENCE_ENABLED && c.PAYMENTS_MODE !== "mock") {
      throw forbidden("Předplatné zatím není aktivováno u platební brány.");
    }
    if (input.recurrenceConsent !== true) {
      throw badRequest("Pro předplatné je nutný souhlas se založením opakované platby.", [
        { path: "recurrenceConsent", message: "Potvrďte souhlas s opakovanou platbou" },
      ]);
    }
    consents = {
      recurrence: {
        version: RECURRENCE_TERMS_VERSION,
        acceptedAt: new Date().toISOString(),
        ip: input.clientIp ?? null,
        consent: RECURRENCE_CONSENT,
        terms: recurrenceTerms({
          productName: product.name,
          priceHaler: product.priceHaler,
          periodMonths: product.periodMonths ?? 1,
          contactEmail: settings.operator.email,
        }),
      },
    };
  }

  const db = getDb();
  const [order] = await db
    .insert(orders)
    .values({
      number: orderNumber(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      productCode: product.code,
      productSnapshot: productSnapshot(product),
      amountHaler: product.priceHaler,
      projectId: input.projectId ?? null,
      paymentMethod: "CARD",
      billing: await billingSnapshot(input.workspaceId, input.userId, input.userEmail),
      consents,
    })
    .returning();

  const gw = getGateway();
  try {
    const created = await gw.createPayment({
      orderNumber: order.number,
      amountHaler: order.amountHaler,
      description: `${product.name} – ARONLINE`,
      itemName: product.name,
      payerEmail: input.userEmail,
      returnUrl: `${c.APP_URL}/platba/navrat`,
      notifyUrl: `${c.APP_URL}/api/payments/notify`,
      recurrence:
        product.type === "SUBSCRIPTION"
          ? {
              cycle: "MONTH",
              period: product.periodMonths ?? 1,
              dateTo: recurrenceDateTo(),
            }
          : undefined,
    });
    await db.insert(payments).values({
      orderId: order.id,
      provider: gw.provider,
      providerPaymentId: created.id,
      state: created.state,
      amountHaler: order.amountHaler,
    });
    if (product.type === "SUBSCRIPTION") {
      await db.insert(subscriptions).values({
        workspaceId: input.workspaceId,
        productCode: product.code,
        status: "PENDING",
        orderId: order.id,
        parentProviderPaymentId: created.id,
        provider: gw.provider,
      });
    }
    await audit("order.create", { userId: input.userId, workspaceId: input.workspaceId, meta: { order: order.number, product: product.code } });
    return { orderId: order.id, gwUrl: created.gwUrl };
  } catch (e) {
    await db.update(orders).set({ status: "FAILED" }).where(eq(orders.id, order.id));
    log.error("payment_create_failed", { order: order.number, ...errorMeta(e) });
    throw new GatewayError("Platbu se nepodařilo založit. Zkuste to prosím později.");
  }
}

/* ------------------------------------------------------------------ */
/* Platba bankovním převodem                                          */
/* ------------------------------------------------------------------ */

/** Je platba převodem k dispozici? (nezávisí na platební bráně) */
export async function bankTransferAvailable(): Promise<{ available: boolean; reason?: string }> {
  const gate = commerceAllowed();
  if (!gate.allowed) return { available: false, reason: gate.reason };
  const s = await getSettings();
  if (!s.bank.enabled) return { available: false, reason: "Platba převodem není zapnutá." };
  if (!s.bank.accountValid) return { available: false, reason: "Číslo účtu pro platbu převodem není nastaveno." };
  return { available: true };
}

/** Variabilní symbol: 10 číslic (RR + 8 náhodných), unikátní. */
function variableSymbol(): string {
  const yy = String(new Date().getUTCFullYear() % 100).padStart(2, "0");
  return `${yy}${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
}

/**
 * Objednávka s úhradou převodem. Kredit / odemčení se připíše až po potvrzení přijetí platby správcem.
 * Předplatné převodem nelze (vyžaduje opakovanou platbu kartou).
 */
export async function createBankOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
  const avail = await bankTransferAvailable();
  if (!avail.available) throw forbidden(avail.reason);
  const product = await validateOrder(input);
  if (product.type !== "ONE_TIME") throw badRequest("Převodem lze zaplatit jednorázovou analýzu nebo balíček. Předplatné se hradí kartou.");
  const settings = await getSettings();
  const db = getDb();
  let order: typeof orders.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const rows = await db
      .insert(orders)
      .values({
        number: orderNumber(),
        workspaceId: input.workspaceId,
        userId: input.userId,
        productCode: product.code,
        productSnapshot: productSnapshot(product),
        amountHaler: product.priceHaler,
        projectId: input.projectId ?? null,
        paymentMethod: "BANK",
        variableSymbol: variableSymbol(),
        billing: await billingSnapshot(input.workspaceId, input.userId, input.userEmail),
      })
      .onConflictDoNothing()
      .returning();
    order = rows[0];
  }
  if (!order) throw conflict("Objednávku se nepodařilo založit, zkuste to prosím znovu.");
  await audit("order.create", { userId: input.userId, workspaceId: input.workspaceId, meta: { order: order.number, product: product.code, method: "BANK" } });
  const c = getConfig();
  const due = new Date(Date.now() + settings.bank.dueDays * 86_400_000);
  await sendMail(
    mails.bankTransferInstructions(input.userEmail, {
      orderNumber: order.number,
      productName: product.name,
      amount: `${(order.amountHaler / 100).toLocaleString("cs-CZ")} Kč`,
      account: settings.bank.account,
      iban: settings.bank.iban,
      vs: order.variableSymbol!,
      due: due.toLocaleDateString("cs-CZ"),
      link: `${c.APP_URL}/app/objednavky/${order.id}`,
    }),
  );
  return { orderId: order.id };
}

/**
 * Správce potvrdí přijetí platby převodem → připíše kredit / odemkne projekt a vystaví doklad.
 * Idempotentní: u již zaplacené objednávky nic neprovede.
 */
export async function confirmBankPayment(orderId: string, adminUserId: string, paidAt = new Date()) {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    if (!order) throw notFound("Objednávka nebyla nalezena.");
    if (order.paymentMethod !== "BANK") throw badRequest("Objednávka není hrazena převodem.");
    if (order.status === "PAID") return { order, fulfilment: null };
    if (order.status !== "PENDING" && order.status !== "CANCELED") throw conflict("Objednávku v tomto stavu nelze potvrdit.");
    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        provider: "BANK",
        providerPaymentId: `bank:${order.number}`,
        state: "PAID",
        amountHaler: order.amountHaler,
      })
      .returning();
    const fulfilment = await fulfil(tx, payment, order);
    await tx.update(payments).set({ fulfilledAt: new Date() }).where(eq(payments.id, payment.id));
    await tx.update(orders).set({ paidAt }).where(eq(orders.id, order.id));
    await audit("admin.bank_payment_confirmed", { userId: adminUserId, workspaceId: order.workspaceId, meta: { order: order.number } }, tx);
    return { order, fulfilment };
  });
  if (result.fulfilment) await notifyPaid(result.order, result.fulfilment);
  return { alreadyPaid: result.fulfilment == null };
}

/** Zrušení nezaplacené objednávky (správce nebo zákazník). */
export async function cancelPendingOrder(orderId: string, actor: { userId: string; workspaceId?: string; isAdmin: boolean }) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || (!actor.isAdmin && order.workspaceId !== actor.workspaceId)) throw notFound("Objednávka nebyla nalezena.");
  if (order.status !== "PENDING") throw conflict("Zrušit lze jen nezaplacenou objednávku.");
  await db.update(orders).set({ status: "CANCELED" }).where(and(eq(orders.id, orderId), eq(orders.status, "PENDING")));
  await audit(actor.isAdmin ? "admin.order_canceled" : "order.canceled", { userId: actor.userId, workspaceId: order.workspaceId, meta: { order: order.number } });
}

export type SyncSource = "notify" | "return" | "poll" | "mock";

/**
 * Zjistí autoritativní stav platby z brány a promítne ho do objednávky, kreditů a předplatného.
 * Bezpečné pro opakované i souběžné volání.
 */
export async function syncPayment(providerPaymentId: string, source: SyncSource, parentIdHint?: string) {
  const gw = getGateway();
  let status: PaymentStatus;
  const db = getDb();
  try {
    status = await gw.getStatus(providerPaymentId);
  } catch (e) {
    await db.insert(paymentEvents).values({
      provider: gw.provider,
      providerPaymentId,
      parentId: parentIdHint ?? null,
      source,
      error: e instanceof Error ? e.message.slice(0, 300) : "error",
    });
    throw e;
  }

  // Ověření, že platba patří našemu účtu
  if (status.targetGoid && status.targetGoid !== expectedGoid()) {
    log.warn("payment_goid_mismatch", { source });
    await db.insert(paymentEvents).values({ provider: gw.provider, providerPaymentId, source, error: "goid_mismatch" });
    return null;
  }

  const parentId = status.parentId ?? parentIdHint;
  const result = await db.transaction(async (tx) => {
    let payment = await lockPayment(tx, gw.provider, providerPaymentId);

    if (!payment && parentId) {
      // Další platba předplatného – založíme záznam navázaný na původní objednávku
      const parent = await tx.query.payments.findFirst({
        where: and(eq(payments.provider, gw.provider), eq(payments.providerPaymentId, parentId)),
      });
      if (!parent) return { kind: "unknown" as const };
      await tx
        .insert(payments)
        .values({
          orderId: parent.orderId,
          provider: gw.provider,
          providerPaymentId,
          parentProviderPaymentId: parentId,
          state: status.state,
          amountHaler: status.amountHaler,
          isRecurrence: true,
        })
        .onConflictDoNothing();
      payment = await lockPayment(tx, gw.provider, providerPaymentId);
    }
    if (!payment) return { kind: "unknown" as const };

    const order = payment.orderId ? await tx.query.orders.findFirst({ where: eq(orders.id, payment.orderId) }) : undefined;
    if (!order) return { kind: "unknown" as const };

    // Kontrola částky, měny a čísla objednávky
    if (status.currency !== "CZK" || status.amountHaler !== order.amountHaler || status.orderNumber !== order.number) {
      log.error("payment_mismatch", { order: order.number, source });
      await tx.insert(paymentEvents).values({ provider: gw.provider, providerPaymentId, source, error: "amount_or_order_mismatch" });
      return { kind: "mismatch" as const, order };
    }

    await tx
      .update(payments)
      .set({ state: status.state, lastStatus: status.raw as object })
      .where(eq(payments.id, payment.id));

    let fulfilledNow = false;
    let fulfilment: Fulfilment | null = null;
    if (status.state === "PAID" && !payment.fulfilledAt) {
      fulfilment = await fulfil(tx, payment, order);
      await tx.update(payments).set({ fulfilledAt: new Date() }).where(eq(payments.id, payment.id));
      fulfilledNow = true;
    } else if ((status.state === "CANCELED" || status.state === "TIMEOUTED") && !payment.isRecurrence && order.status === "PENDING") {
      await tx.update(orders).set({ status: "CANCELED" }).where(eq(orders.id, order.id));
      await tx
        .update(subscriptions)
        .set({ status: "EXPIRED" })
        .where(and(eq(subscriptions.parentProviderPaymentId, providerPaymentId), eq(subscriptions.status, "PENDING")));
    } else if ((status.state === "REFUNDED" || status.state === "PARTIALLY_REFUNDED") && payment.fulfilledAt) {
      await handleRefund(tx, payment, order, status.state);
    }

    await tx.insert(paymentEvents).values({
      provider: gw.provider,
      providerPaymentId,
      parentId: parentId ?? null,
      source,
      stateAfter: status.state,
    });
    return { kind: "ok" as const, order, state: status.state, fulfilledNow, fulfilment };
  });

  if (result.kind === "ok" && result.fulfilledNow && result.fulfilment) {
    await notifyPaid(result.order, result.fulfilment);
  }
  return result;
}

/** E-mail o přijaté platbě s dokladem v příloze (+ potvrzení založení opakované platby). Chyby jen loguje. */
async function notifyPaid(order: typeof orders.$inferSelect, f: Fulfilment) {
  try {
    const db = getDb();
    const user = await db.query.users.findFirst({ where: eq(users.id, order.userId) });
    const billingEmail = (order.billing as InvoiceParty | null)?.email;
    const to = billingEmail || user?.email;
    if (!to) return;
    const snap = order.productSnapshot as { name: string; priceHaler: number; periodMonths: number | null };
    const inv = f.invoiceId ? await db.query.invoices.findFirst({ where: eq(invoices.id, f.invoiceId) }) : undefined;
    const mail = mails.paymentReceived(to, order.number, snap.name, `${(f.amountHaler / 100).toLocaleString("cs-CZ")} Kč`, inv?.number);
    if (inv) {
      mail.attachments = [{ filename: invoiceFileName(inv), content: await renderInvoicePdf(inv), contentType: "application/pdf" }];
    }
    await sendMail(mail);
    if (f.subscriptionActivated) {
      const settings = await getSettings();
      const stored = (order.consents as { recurrence?: { terms?: { label: string; value: string }[] } } | null)?.recurrence?.terms;
      const terms =
        stored ??
        recurrenceTerms({ productName: snap.name, priceHaler: snap.priceHaler, periodMonths: snap.periodMonths ?? 1, contactEmail: settings.operator.email });
      await sendMail(mails.subscriptionCreated(to, snap.name, terms));
    }
  } catch (e) {
    log.error("payment_mail_failed", { order: order.number, ...errorMeta(e) });
  }
}

async function lockPayment(tx: Tx, provider: "GOPAY" | "MOCK", providerPaymentId: string) {
  const rows = await tx
    .select()
    .from(payments)
    .where(and(eq(payments.provider, provider), eq(payments.providerPaymentId, providerPaymentId)))
    .for("update")
    .limit(1);
  return rows[0] ?? null;
}

interface Snapshot {
  code: string;
  name: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  credits: number | null;
  periodMonths: number | null;
}

export interface Fulfilment {
  invoiceId: string | null;
  amountHaler: number;
  subscriptionActivated: boolean;
}

async function fulfil(tx: Tx, payment: typeof payments.$inferSelect, order: typeof orders.$inferSelect): Promise<Fulfilment> {
  const snap = order.productSnapshot as Snapshot;
  const now = new Date();
  if (snap.type === "ONE_TIME") {
    await grantCredits(tx, {
      workspaceId: order.workspaceId,
      amount: snap.credits ?? 0,
      key: `payment:${payment.provider}:${payment.providerPaymentId}`,
      orderId: order.id,
      paymentId: payment.id,
      note: snap.name,
    });
    await tx.update(orders).set({ status: "PAID", paidAt: now }).where(eq(orders.id, order.id));
    if (order.projectId) {
      const projectId = order.projectId;
      try {
        // vnořená transakce = savepoint; při chybě zůstane kredit připsán a projekt lze odemknout ručně
        await tx.transaction((sp) => unlockProjectTx(sp, { workspaceId: order.workspaceId, projectId, userId: order.userId }));
      } catch (e) {
        log.warn("auto_unlock_failed", { order: order.number, ...errorMeta(e) });
      }
    }
    await audit("order.paid", { userId: order.userId, workspaceId: order.workspaceId, meta: { order: order.number } }, tx);
    const inv = await issueInvoiceTx(tx, { order, payment, paidAt: now });
    return { invoiceId: inv.id, amountHaler: payment.amountHaler, subscriptionActivated: false };
  }

  // Předplatné
  const months = snap.periodMonths ?? 1;
  const parentId = payment.isRecurrence ? payment.parentProviderPaymentId : payment.providerPaymentId;
  const [sub] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.parentProviderPaymentId, parentId ?? ""))
    .for("update")
    .limit(1);
  if (!sub) {
    log.error("subscription_missing_for_payment", { order: order.number });
    return { invoiceId: null, amountHaler: payment.amountHaler, subscriptionActivated: false };
  }
  // currentPeriodStart = kotva (aktivace); obnova jen prodlužuje zaplacené období
  const paidFrom = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  const paidTo = addMonths(paidFrom, months);
  await tx
    .update(subscriptions)
    .set({
      status: sub.status === "CANCELED" ? "CANCELED" : "ACTIVE",
      currentPeriodStart: sub.currentPeriodStart ?? now,
      currentPeriodEnd: paidTo,
    })
    .where(eq(subscriptions.id, sub.id));
  if (!payment.isRecurrence) {
    await tx.update(orders).set({ status: "PAID", paidAt: now }).where(eq(orders.id, order.id));
  }
  await audit(
    payment.isRecurrence ? "subscription.renewed" : "subscription.activated",
    { userId: order.userId, workspaceId: order.workspaceId, meta: { order: order.number } },
    tx,
  );
  const inv = await issueInvoiceTx(tx, { order, payment, paidAt: now, period: { from: paidFrom, to: paidTo } });
  return { invoiceId: inv.id, amountHaler: payment.amountHaler, subscriptionActivated: !payment.isRecurrence };
}

async function handleRefund(tx: Tx, payment: typeof payments.$inferSelect, order: typeof orders.$inferSelect, state: string) {
  const snap = order.productSnapshot as Snapshot;
  if (state === "REFUNDED" && !payment.isRecurrence) {
    await tx.update(orders).set({ status: "REFUNDED" }).where(eq(orders.id, order.id));
  }
  if (snap.type === "ONE_TIME" && state === "REFUNDED") {
    // odebrání kreditů (zůstatek může jít do mínusu, pokud byly spotřebovány)
    await grantCredits(tx, {
      workspaceId: order.workspaceId,
      amount: -(snap.credits ?? 0),
      key: `refund:${payment.provider}:${payment.providerPaymentId}`,
      orderId: order.id,
      paymentId: payment.id,
      reason: "REFUND",
      note: "Vrácení platby",
    });
  }
  if (snap.type === "SUBSCRIPTION") {
    await tx
      .update(subscriptions)
      .set({ status: "EXPIRED", currentPeriodEnd: new Date() })
      .where(eq(subscriptions.parentProviderPaymentId, payment.parentProviderPaymentId ?? payment.providerPaymentId));
  }
  await audit("order.refunded", { userId: order.userId, workspaceId: order.workspaceId, meta: { order: order.number, state } }, tx);
}

/** Zrušení předplatného – zastaví opakované platby, předplatné platí do konce období. */
export async function cancelSubscription(workspaceId: string, userId: string) {
  const db = getDb();
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.workspaceId, workspaceId), inArray(subscriptions.status, ["ACTIVE", "PENDING"])),
  });
  if (!sub) throw notFound("Aktivní předplatné nebylo nalezeno.");
  if (sub.parentProviderPaymentId && sub.status === "ACTIVE") {
    try {
      await getGateway().voidRecurrence(sub.parentProviderPaymentId);
    } catch (e) {
      log.error("void_recurrence_failed", errorMeta(e));
      throw new GatewayError("Opakovanou platbu se nepodařilo zrušit u platební brány. Zkuste to prosím znovu.");
    }
  }
  await db
    .update(subscriptions)
    .set({
      status: sub.status === "PENDING" ? "EXPIRED" : "CANCELED",
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
  await audit("subscription.canceled", { userId, workspaceId });
  if (sub.status === "ACTIVE") {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const product = await getProduct(sub.productCode);
    if (user && !user.isGuest) {
      await sendMail(
        mails.subscriptionCanceled(user.email, product?.name ?? sub.productCode, sub.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString("cs-CZ") : "konce zaplaceného období"),
      );
    }
  }
}

export async function listOrders(workspaceId: string) {
  return getDb().query.orders.findMany({
    where: eq(orders.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 100,
  });
}
