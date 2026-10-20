/**
 * Rozhraní platební brány. Implementace: GoPay (sandbox/produkce) a Mock (jen vývoj a testy).
 */
export interface CreatePaymentParams {
  orderNumber: string;
  amountHaler: number;
  description: string;
  itemName: string;
  payerEmail: string;
  returnUrl: string;
  notifyUrl: string;
  /** Opakovaná platba (předplatné) – měsíční cyklus. */
  recurrence?: { cycle: "MONTH"; period: number; dateTo: string };
}

export interface CreatedPayment {
  id: string;
  gwUrl: string;
  state: string;
}

export interface PaymentStatus {
  id: string;
  state: string;
  amountHaler: number;
  currency: string;
  orderNumber: string;
  parentId?: string;
  /** GoID příjemce – musí odpovídat našemu účtu. */
  targetGoid?: string;
  recurrenceState?: string;
  raw: unknown;
}

export interface PaymentGateway {
  provider: "GOPAY" | "MOCK";
  createPayment(p: CreatePaymentParams): Promise<CreatedPayment>;
  getStatus(id: string): Promise<PaymentStatus>;
  voidRecurrence(id: string): Promise<void>;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}
