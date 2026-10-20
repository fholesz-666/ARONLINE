/**
 * Simulovaná platební brána – POUZE pro vývoj a automatické testy (PAYMENTS_MODE=mock).
 * V produkci ji konfigurace nedovolí zapnout (viz src/server/config.ts).
 */
import { randomInt } from "node:crypto";
import { GatewayError, type CreatePaymentParams, type CreatedPayment, type PaymentGateway, type PaymentStatus } from "./gateway";

interface MockPayment {
  id: string;
  state: string;
  amountHaler: number;
  orderNumber: string;
  parentId?: string;
  recurrence?: CreatePaymentParams["recurrence"];
  recurrenceState?: string;
  returnUrl: string;
  notifyUrl: string;
}

const g = globalThis as unknown as { __mockPayments?: Map<string, MockPayment> };
const store = (g.__mockPayments ??= new Map());

export const MOCK_GOID = "8000000000";

export class MockGateway implements PaymentGateway {
  provider = "MOCK" as const;
  constructor(private readonly appUrl: string) {}

  async createPayment(p: CreatePaymentParams): Promise<CreatedPayment> {
    const id = String(3_000_000_000 + randomInt(0, 999_999_999));
    store.set(id, {
      id,
      state: "CREATED",
      amountHaler: p.amountHaler,
      orderNumber: p.orderNumber,
      recurrence: p.recurrence,
      recurrenceState: p.recurrence ? "REQUESTED" : undefined,
      returnUrl: p.returnUrl,
      notifyUrl: p.notifyUrl,
    });
    return { id, gwUrl: `${this.appUrl}/platba/mock-brana?id=${id}`, state: "CREATED" };
  }

  async getStatus(id: string): Promise<PaymentStatus> {
    const p = store.get(id);
    if (!p) throw new GatewayError("Platba neexistuje", 404);
    return {
      id: p.id,
      state: p.state,
      amountHaler: p.amountHaler,
      currency: "CZK",
      orderNumber: p.orderNumber,
      parentId: p.parentId,
      targetGoid: MOCK_GOID,
      recurrenceState: p.recurrenceState,
      raw: { ...p, mock: true },
    };
  }

  async voidRecurrence(id: string): Promise<void> {
    const p = store.get(id);
    if (!p) throw new GatewayError("Platba neexistuje", 404);
    p.recurrenceState = "STOPPED";
  }

  /* --- Ovládání simulace (testy, stránka /platba/mock-brana) --- */

  static get(id: string) {
    return store.get(id);
  }

  static setState(id: string, state: "PAID" | "CANCELED" | "TIMEOUTED" | "REFUNDED") {
    const p = store.get(id);
    if (!p) throw new GatewayError("Platba neexistuje", 404);
    p.state = state;
    if (state === "PAID" && p.recurrence) p.recurrenceState = "STARTED";
    return p;
  }

  /** Simuluje další automatickou platbu předplatného. */
  static createRecurrence(parentId: string, state: "PAID" | "CANCELED" = "PAID") {
    const parent = store.get(parentId);
    if (!parent) throw new GatewayError("Platba neexistuje", 404);
    if (parent.recurrenceState !== "STARTED") throw new GatewayError("Opakování není aktivní", 409);
    const id = String(3_000_000_000 + randomInt(0, 999_999_999));
    store.set(id, {
      id,
      state,
      amountHaler: parent.amountHaler,
      orderNumber: parent.orderNumber,
      parentId,
      returnUrl: parent.returnUrl,
      notifyUrl: parent.notifyUrl,
    });
    return id;
  }
}
