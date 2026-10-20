import { describe, expect, it } from "vitest";
import { GoPayGateway } from "@/server/payments/gopay";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

function fakeFetch(calls: Call[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {})),
      body: String(init?.body ?? ""),
    });
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
    if (url.endsWith("/oauth2/token")) return json({ token_type: "bearer", access_token: "TOKEN123", expires_in: 1800 });
    if (url.endsWith("/payments/payment") && init?.method === "POST") return json({ id: 3000000001, gw_url: "https://gw.sandbox.gopay.com/gw/xyz", state: "CREATED" });
    if (url.match(/\/payments\/payment\/3000000001$/))
      return json({ id: 3000000001, state: "PAID", amount: 14900, currency: "CZK", order_number: "AR20261020-000001", target: { type: "ACCOUNT", goid: 8123456789 } });
    if (url.match(/\/payments\/payment\/3000000002$/))
      return json({ id: 3000000002, parent_id: 3000000001, state: "PAID", amount: 49900, currency: "CZK", order_number: "AR1", recurrence: { recurrence_state: "STARTED" } });
    if (url.endsWith("/void-recurrence")) return json({ id: 3000000001, result: "FINISHED" });
    return json({ errors: [{ error_name: "PAYMENT_NOT_FOUND" }] }, 404);
  }) as typeof fetch;
}

describe("GoPay klient (simulované odpovědi podle doc.gopay.com)", () => {
  const calls: Call[] = [];
  const gw = new GoPayGateway({ goid: "8123456789", clientId: "cid", clientSecret: "secret", mode: "sandbox", fetchImpl: fakeFetch(calls) });

  it("vytvoření platby: OAuth Basic, částka v haléřích, callbacky, GoID", async () => {
    const r = await gw.createPayment({
      orderNumber: "AR20261020-000001",
      amountHaler: 14900,
      description: "Jednorázová analýza – ARONLINE",
      itemName: "Jednorázová analýza",
      payerEmail: "a@example.cz",
      returnUrl: "https://app.example.cz/platba/navrat",
      notifyUrl: "https://app.example.cz/api/payments/notify",
    });
    expect(r).toEqual({ id: "3000000001", gwUrl: "https://gw.sandbox.gopay.com/gw/xyz", state: "CREATED" });
    const token = calls.find((c) => c.url.endsWith("/oauth2/token"))!;
    expect(token.url.startsWith("https://gw.sandbox.gopay.com/api")).toBe(true);
    expect(token.headers.Authorization).toBe(`Basic ${Buffer.from("cid:secret").toString("base64")}`);
    expect(token.body).toContain("grant_type=client_credentials");
    const create = calls.find((c) => c.url.endsWith("/payments/payment"))!;
    expect(create.headers.Authorization).toBe("Bearer TOKEN123");
    const body = JSON.parse(create.body);
    expect(body.amount).toBe(14900);
    expect(body.currency).toBe("CZK");
    expect(body.target).toEqual({ type: "ACCOUNT", goid: 8123456789 });
    expect(body.callback.notification_url).toBe("https://app.example.cz/api/payments/notify");
    expect(body.recurrence).toBeUndefined();
  });

  it("token se znovu nepožaduje, dokud neexpiruje", async () => {
    const before = calls.filter((c) => c.url.endsWith("/oauth2/token")).length;
    await gw.getStatus("3000000001");
    expect(calls.filter((c) => c.url.endsWith("/oauth2/token")).length).toBe(before);
  });

  it("předplatné: opakovaná platba MONTH a jen platební karta", async () => {
    await gw.createPayment({
      orderNumber: "AR2",
      amountHaler: 49900,
      description: "Profesionální předplatné",
      itemName: "Profesionální předplatné",
      payerEmail: "a@example.cz",
      returnUrl: "r",
      notifyUrl: "n",
      recurrence: { cycle: "MONTH", period: 1, dateTo: "2036-10-20" },
    });
    const body = JSON.parse(calls.filter((c) => c.url.endsWith("/payments/payment")).pop()!.body);
    expect(body.recurrence).toEqual({ recurrence_cycle: "MONTH", recurrence_period: 1, recurrence_date_to: "2036-10-20" });
    expect(body.payer.allowed_payment_instruments).toEqual(["PAYMENT_CARD"]);
  });

  it("stav platby včetně rodičovské platby a GoID", async () => {
    const s = await gw.getStatus("3000000001");
    expect(s).toMatchObject({ id: "3000000001", state: "PAID", amountHaler: 14900, currency: "CZK", targetGoid: "8123456789" });
    const child = await gw.getStatus("3000000002");
    expect(child.parentId).toBe("3000000001");
  });

  it("zrušení opakování a odmítnutí neplatného ID", async () => {
    await gw.voidRecurrence("3000000001");
    expect(calls.some((c) => c.url.endsWith("/payments/payment/3000000001/void-recurrence") && c.method === "POST")).toBe(true);
    await expect(gw.getStatus("../etc")).rejects.toThrow();
    await expect(gw.getStatus("999")).rejects.toThrow(/HTTP 404/);
  });
});
