import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { presetValues } from "@/core/vv/presets";
import { setupTestDb, teardownTestDb } from "./setup";

type Mods = {
  auth: typeof import("@/server/services/auth");
  vv: typeof import("@/server/services/vv");
  payments: typeof import("@/server/payments/service");
  mock: typeof import("@/server/payments/mock");
  billing: typeof import("@/server/services/billing");
  schema: typeof import("@/server/db/schema");
  model: typeof import("@/server/documents/vv-model");
  admin: typeof import("@/server/services/admin");
};
let m: Mods;
let db: Awaited<ReturnType<typeof setupTestDb>>;

const data = {
  version: 1 as const,
  object: { name: "Rodinný dům", address: "Dačického 1, Praha", description: "", investor: "", number: "PVV 1", date: "2026-11-16", place: "Praze" },
  basis: ["ČSN 33 2000-5-51 ed. 3 + Z1 + Z2"],
  committee: { chair: { name: "Jan Novák", role: "projektant" }, members: [{ name: "Petr Malý", role: "revizní technik" }] },
  spaces: [
    { id: "s1", name: "Obývací pokoj", preset: "normal", note: "", values: presetValues("normal") },
    { id: "s2", name: "Střecha s FVE", preset: "pv-roof", note: "", values: presetValues("pv-roof") },
  ],
  notes: "",
};

beforeAll(async () => {
  db = await setupTestDb();
  m = {
    auth: await import("@/server/services/auth"),
    vv: await import("@/server/services/vv"),
    payments: await import("@/server/payments/service"),
    mock: await import("@/server/payments/mock"),
    billing: await import("@/server/services/billing"),
    schema: await import("@/server/db/schema"),
    model: await import("@/server/documents/vv-model"),
    admin: await import("@/server/services/admin"),
  };
});
afterAll(teardownTestDb);

describe("protokol o určení vnějších vlivů", () => {
  it("vyžaduje potvrzení všech členů komise", async () => {
    const base = { data, email: "autor@example.cz", marketingConsent: false, acceptTerms: true as const };
    await expect(m.vv.createProtocol({ ...base, confirmations: [true] }, "1.2.3.4")).rejects.toMatchObject({ status: 400 });
    await expect(m.vv.createProtocol({ ...base, confirmations: [true, false] }, "1.2.3.4")).rejects.toMatchObject({ status: 400 });
  });

  it("přístup jen s platným tokenem, token se neukládá v čitelné podobě", async () => {
    const { id, token } = await m.vv.createProtocol({ data, confirmations: [true, true], email: "autor@example.cz", marketingConsent: true, acceptTerms: true }, "1.2.3.4");
    const row = await m.vv.getProtocol(id, token);
    expect(row.tokenHash).not.toBe(token);
    expect((row.confirmations as { members: string[] }).members).toEqual(["Jan Novák", "Petr Malý"]);
    await expect(m.vv.getProtocol(id, "spatny-token")).rejects.toMatchObject({ status: 404 });
    await expect(m.vv.getProtocol(id, null)).rejects.toMatchObject({ status: 404 });
  });

  it("bezplatná verze má reklamní patičku, placená ne", () => {
    expect(m.model.buildVvDoc(data, { premium: false }).brandingLines.length).toBeGreaterThan(0);
    const premium = m.model.buildVvDoc(data, { premium: true });
    expect(premium.branding).toBe(false);
    expect(premium.summary.map((r) => r[2])).toEqual(["normální", "abnormální"]);
  });

  it("host zaplatí placenou verzi a protokol se odemkne; produkt není v ceníku analýz", async () => {
    const { id } = await m.vv.createProtocol({ data, confirmations: [true, true], email: "autor@example.cz", marketingConsent: false, acceptTerms: true }, "1.2.3.4");
    const { user, workspace } = await m.auth.createGuestUser();
    const base = { workspaceId: workspace.id, userId: user.id, emailVerified: false, isGuest: true, userEmail: "autor@example.cz" };

    await expect(m.payments.createOrder({ ...base, productCode: "VV_PREMIUM" })).rejects.toMatchObject({ status: 400 });
    await expect(m.payments.createBankOrder({ ...base, productCode: "VV_PREMIUM", vvProtocolId: id })).rejects.toMatchObject({ status: 400 });

    const { gwUrl } = await m.payments.createOrder({ ...base, productCode: "VV_PREMIUM", vvProtocolId: id });
    const pid = new URL(gwUrl).searchParams.get("id")!;
    m.mock.MockGateway.setState(pid, "PAID");
    await m.payments.syncPayment(pid, "notify");

    const row = await db.query.vvProtocols.findFirst({ where: eq(m.schema.vvProtocols.id, id) });
    expect(row?.premiumAt).not.toBeNull();
    expect(await m.billing.creditBalance(workspace.id)).toBe(0);
    await expect(m.payments.createOrder({ ...base, productCode: "VV_PREMIUM", vvProtocolId: id })).rejects.toMatchObject({ status: 409 });

    expect((await m.billing.listProducts()).some((p) => p.code === "VV_PREMIUM")).toBe(false);
    expect((await m.billing.listProducts(false, true)).some((p) => p.code === "VV_PREMIUM")).toBe(true);
  });

  it("registrovaný uživatel odemkne protokol kreditem od správce a vidí ho bez odkazu", async () => {
    const { user, workspace } = await m.auth.registerUser({ email: "projektant@example.cz", password: "Bezpecne-heslo-123", name: "Projektant", acceptTerms: true });
    const { user: admin } = await m.auth.registerUser({ email: "spravce@example.cz", password: "Bezpecne-heslo-123", name: "Správce", acceptTerms: true });
    const { id, token } = await m.vv.createProtocol({ data, confirmations: [true, true], email: "projektant@example.cz", marketingConsent: false, acceptTerms: true }, "1.2.3.4");

    // bezplatný protokol se do účtu neukládá
    await expect(m.vv.getProtocol(id, null, user.id)).rejects.toMatchObject({ status: 404 });
    expect((await m.vv.claimProtocol(await m.vv.getProtocol(id, token, user.id), user.id)).userId).toBeNull();

    // bez kreditu nejde
    await expect(m.vv.redeemWithCredit(id, token, { userId: user.id, workspaceId: workspace.id })).rejects.toMatchObject({ status: 402 });

    await m.admin.adjustCredits({ workspaceId: workspace.id, delta: 2, note: "VV zdarma", adminId: admin.id });
    await m.vv.redeemWithCredit(id, token, { userId: user.id, workspaceId: workspace.id });
    const row = await db.query.vvProtocols.findFirst({ where: eq(m.schema.vvProtocols.id, id) });
    expect(row?.premiumAt).not.toBeNull();
    // po odemknutí patří do účtu: vlastník ho otevře bez odkazu, cizí uživatel ne
    expect((await m.vv.getProtocol(id, null, user.id)).id).toBe(id);
    await expect(m.vv.getProtocol(id, null, admin.id)).rejects.toMatchObject({ status: 404 });
    expect((await m.vv.listUserProtocols(user.id)).map((p) => p.id)).toContain(id);
    expect(await m.billing.creditBalance(workspace.id)).toBe(1);
    await expect(m.vv.redeemWithCredit(id, null, { userId: user.id, workspaceId: workspace.id })).rejects.toMatchObject({ status: 409 });
    expect(await m.billing.creditBalance(workspace.id)).toBe(1);
  });

  it("zaplacený protokol se uloží do účtu registrovaného kupujícího, host účet nedostane", async () => {
    const { user, workspace } = await m.auth.registerUser({ email: "kupujici@example.cz", password: "Bezpecne-heslo-123", name: "Kupující", acceptTerms: true });
    const { id } = await m.vv.createProtocol({ data, confirmations: [true, true], email: "kupujici@example.cz", marketingConsent: false, acceptTerms: true }, "1.2.3.4");
    const { gwUrl } = await m.payments.createOrder({
      workspaceId: workspace.id, userId: user.id, userEmail: "kupujici@example.cz", emailVerified: true, isGuest: false, productCode: "VV_PREMIUM", vvProtocolId: id,
    });
    const pid = new URL(gwUrl).searchParams.get("id")!;
    m.mock.MockGateway.setState(pid, "PAID");
    await m.payments.syncPayment(pid, "notify");
    expect((await m.vv.getProtocol(id, null, user.id)).userId).toBe(user.id);
  });

  it("Profi protokol otevřený přes odkaz přihlášeným uživatelem se přiřadí k jeho účtu", async () => {
    const { user } = await m.auth.registerUser({ email: "druhy@example.cz", password: "Bezpecne-heslo-123", name: "Druhý", acceptTerms: true });
    const { id, token } = await m.vv.createProtocol({ data, confirmations: [true, true], email: "druhy@example.cz", marketingConsent: false, acceptTerms: true }, "1.2.3.4");
    // Profi bez vlastníka (např. zaplatil host)
    await db.update(m.schema.vvProtocols).set({ premiumAt: new Date() }).where(eq(m.schema.vvProtocols.id, id));
    const row = await m.vv.getProtocol(id, token, user.id);
    expect(row.userId).toBeNull();
    expect((await m.vv.claimProtocol(row, user.id)).userId).toBe(user.id);
    expect((await m.vv.getProtocol(id, null, user.id)).id).toBe(id);
  });
});
