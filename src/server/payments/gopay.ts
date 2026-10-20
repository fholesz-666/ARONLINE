/**
 * Klient GoPay REST API (https://doc.gopay.com/).
 * - OAuth2 client_credentials, token se cachuje do vypršení.
 * - Notifikace od GoPay obsahují jen ID platby; stav se vždy ověřuje dotazem GET /payments/payment/{id}.
 * - Klíče se čtou pouze ze serverových proměnných prostředí.
 */
import { GatewayError, type CreatePaymentParams, type CreatedPayment, type PaymentGateway, type PaymentStatus } from "./gateway";

export interface GoPayConfig {
  goid: string;
  clientId: string;
  clientSecret: string;
  mode: "sandbox" | "production";
  /** Pro testy lze podstrčit vlastní fetch. */
  fetchImpl?: typeof fetch;
}

const BASE = {
  sandbox: "https://gw.sandbox.gopay.com/api",
  production: "https://gate.gopay.cz/api",
} as const;

export class GoPayGateway implements PaymentGateway {
  provider = "GOPAY" as const;
  private token: { value: string; expiresAt: number; scope: string } | null = null;
  private readonly fetch: typeof fetch;

  constructor(private readonly cfg: GoPayConfig) {
    this.fetch = cfg.fetchImpl ?? fetch;
  }

  private get base() {
    return BASE[this.cfg.mode];
  }

  private async getToken(scope: "payment-create" | "payment-all"): Promise<string> {
    if (this.token && this.token.scope === scope && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString("base64");
    const res = await this.fetch(`${this.base}/oauth2/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new GatewayError(`GoPay OAuth selhal (HTTP ${res.status})`, res.status);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, scope };
    return data.access_token;
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown, form = false): Promise<T> {
    const token = await this.getToken("payment-all");
    const res = await this.fetch(`${this.base}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" } : {}),
      },
      body: body ? (form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body)) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      // tělo chyby neobsahuje citlivé údaje, ale nelogujeme ho celé
      let detail = "";
      try {
        const j = (await res.json()) as { errors?: { error_name?: string }[] };
        detail = j.errors?.map((e) => e.error_name).join(", ") ?? "";
      } catch {
        /* ignore */
      }
      throw new GatewayError(`GoPay ${method} ${path.replace(/\d{6,}/g, "{id}")} selhal (HTTP ${res.status}) ${detail}`, res.status);
    }
    return (await res.json()) as T;
  }

  async createPayment(p: CreatePaymentParams): Promise<CreatedPayment> {
    const body: Record<string, unknown> = {
      payer: {
        allowed_payment_instruments: p.recurrence ? ["PAYMENT_CARD"] : ["PAYMENT_CARD", "BANK_ACCOUNT", "APPLE_PAY", "GPAY"],
        default_payment_instrument: "PAYMENT_CARD",
        contact: { email: p.payerEmail },
      },
      target: { type: "ACCOUNT", goid: Number(this.cfg.goid) },
      amount: p.amountHaler,
      currency: "CZK",
      order_number: p.orderNumber,
      order_description: p.description.slice(0, 256),
      items: [{ type: "ITEM", name: p.itemName.slice(0, 256), amount: p.amountHaler, count: 1 }],
      callback: { return_url: p.returnUrl, notification_url: p.notifyUrl },
      lang: "CS",
    };
    if (p.recurrence) {
      body.recurrence = {
        recurrence_cycle: p.recurrence.cycle,
        recurrence_period: p.recurrence.period,
        recurrence_date_to: p.recurrence.dateTo,
      };
    }
    const data = await this.call<{ id: number; gw_url: string; state: string }>("POST", "/payments/payment", body);
    return { id: String(data.id), gwUrl: data.gw_url, state: data.state };
  }

  async getStatus(id: string): Promise<PaymentStatus> {
    if (!/^\d{1,20}$/.test(id)) throw new GatewayError("Neplatné ID platby");
    const d = await this.call<{
      id: number;
      parent_id?: number;
      state: string;
      amount: number;
      currency: string;
      order_number: string;
      target?: { goid?: number };
      recurrence?: { recurrence_state?: string };
    }>("GET", `/payments/payment/${id}`);
    return {
      id: String(d.id),
      state: d.state,
      amountHaler: d.amount,
      currency: d.currency,
      orderNumber: d.order_number,
      parentId: d.parent_id != null ? String(d.parent_id) : undefined,
      targetGoid: d.target?.goid != null ? String(d.target.goid) : undefined,
      recurrenceState: d.recurrence?.recurrence_state,
      raw: d,
    };
  }

  async voidRecurrence(id: string): Promise<void> {
    if (!/^\d{1,20}$/.test(id)) throw new GatewayError("Neplatné ID platby");
    await this.call("POST", `/payments/payment/${id}/void-recurrence`, {});
  }
}
