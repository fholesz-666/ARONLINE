import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { familyHouse } from "@/core/risk/__tests__/fixtures";
import { getVerificationSummary as getVerificationSummaryForTest } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";
import { setupTestDb, teardownTestDb } from "./setup";

type Mods = {
  auth: typeof import("@/server/services/auth");
  projects: typeof import("@/server/services/projects");
  billing: typeof import("@/server/services/billing");
  payments: typeof import("@/server/payments/service");
  mock: typeof import("@/server/payments/mock");
  ws: typeof import("@/server/services/workspace");
  schema: typeof import("@/server/db/schema");
  config: typeof import("@/server/config");
};
let m: Mods;
let db: Awaited<ReturnType<typeof setupTestDb>>;

interface TestUser {
  id: string;
  email: string;
  workspaceId: string;
}
let alice: TestUser;
let bob: TestUser;

async function makeUser(email: string, name: string): Promise<TestUser> {
  const { user, workspace } = await m.auth.registerUser({ email, password: "Bezpecne-heslo-123", name, acceptTerms: true });
  await db.update(m.schema.users).set({ emailVerifiedAt: new Date() }).where(eq(m.schema.users.id, user.id));
  return { id: user.id, email, workspaceId: workspace.id };
}

async function newProject(u: TestUser, name = "Test") {
  return m.projects.createProject({ workspaceId: u.workspaceId, userId: u.id, name, buildingType: "family_house" });
}

async function pay(u: TestUser, productCode: string, projectId?: string, state: "PAID" | "CANCELED" = "PAID") {
  const { gwUrl, orderId } = await m.payments.createOrder({
    workspaceId: u.workspaceId,
    userId: u.id,
    userEmail: u.email,
    emailVerified: true,
    productCode,
    projectId,
  });
  const pid = new URL(gwUrl).searchParams.get("id")!;
  m.mock.MockGateway.setState(pid, state);
  await m.payments.syncPayment(pid, "notify");
  return { pid, orderId };
}

beforeAll(async () => {
  db = await setupTestDb();
  m = {
    auth: await import("@/server/services/auth"),
    projects: await import("@/server/services/projects"),
    billing: await import("@/server/services/billing"),
    payments: await import("@/server/payments/service"),
    mock: await import("@/server/payments/mock"),
    ws: await import("@/server/services/workspace"),
    schema: await import("@/server/db/schema"),
    config: await import("@/server/config"),
  };
  alice = await makeUser("alice@example.cz", "Alice");
  bob = await makeUser("bob@example.cz", "Bob");
});
afterAll(teardownTestDb);

describe("oddělení dat zákazníků", () => {
  it("cizí projekt nelze číst, upravit, kopírovat, smazat ani spočítat", async () => {
    const p = await newProject(alice);
    await expect(m.ws.requireProjectAccess(bob.id, bob.workspaceId, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(m.ws.requireProjectAccess(bob.id, alice.workspaceId, p.id)).rejects.toMatchObject({ status: 403 });
    await expect(
      m.projects.updateProject({ userId: bob.id, workspaceId: bob.workspaceId, projectId: p.id, version: 1, data: p.data }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(m.projects.duplicateProject(bob.id, bob.workspaceId, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(m.projects.deleteProject(bob.id, bob.workspaceId, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(m.projects.runCalculation(bob.id, bob.workspaceId, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(m.billing.unlockProject({ workspaceId: bob.workspaceId, projectId: p.id, userId: bob.id })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("cizí projekt nelze koupit k odemčení", async () => {
    const p = await newProject(alice);
    await expect(
      m.payments.createOrder({
        workspaceId: bob.workspaceId,
        userId: bob.id,
        userEmail: bob.email,
        emailVerified: true,
        productCode: "SINGLE",
        projectId: p.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("autosave a zámek objektu", () => {
  it("souběžná úprava se starou verzí vrací konflikt", async () => {
    const p = await newProject(alice);
    const r1 = await m.projects.updateProject({ userId: alice.id, workspaceId: alice.workspaceId, projectId: p.id, version: 1, data: p.data });
    expect(r1.version).toBe(2);
    await expect(
      m.projects.updateProject({ userId: alice.id, workspaceId: alice.workspaceId, projectId: p.id, version: 1, data: p.data }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("neplatná data projektu jsou odmítnuta", async () => {
    const p = await newProject(alice);
    await expect(
      m.projects.updateProject({
        userId: alice.id,
        workspaceId: alice.workspaceId,
        projectId: p.id,
        version: 1,
        data: { identification: { docStage: "XXX" } },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("kredity, odemykání a platby (mock brána)", () => {
  it("bez kreditu nelze odemknout", async () => {
    const p = await newProject(alice);
    await expect(m.billing.unlockProject({ workspaceId: alice.workspaceId, projectId: p.id, userId: alice.id })).rejects.toMatchObject({
      status: 402,
    });
  });

  it("jednorázová analýza: kredit se připíše jen po PAID a projekt se odemkne", async () => {
    const p = await newProject(alice);
    const before = await m.billing.creditBalance(alice.workspaceId);
    const { pid, orderId } = await pay(alice, "SINGLE", p.id);
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before); // +1 a hned −1 za odemčení
    const unlock = await m.billing.getUnlock(p.id);
    expect(unlock?.source).toBe("CREDIT");
    const order = await db.query.orders.findFirst({ where: eq(m.schema.orders.id, orderId) });
    expect(order?.status).toBe("PAID");

    // opakované a souběžné notifikace nic dalšího nepřipíší
    await Promise.all([
      m.payments.syncPayment(pid, "notify"),
      m.payments.syncPayment(pid, "return"),
      m.payments.syncPayment(pid, "notify"),
      m.payments.syncPayment(pid, "poll"),
    ]);
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before);
    const entries = await db.query.creditLedger.findMany({ where: eq(m.schema.creditLedger.orderId, orderId) });
    expect(entries.length).toBe(1);

    // po odemčení je identifikace objektu zamčena
    const proj = await m.ws.requireProjectAccess(alice.id, alice.workspaceId, p.id);
    expect(proj.objectLockedAt).not.toBeNull();
    const data = structuredClone(proj.data) as { site: { address: unknown } };
    data.site.address = { text: "Jiná adresa 1, Praha" };
    await expect(
      m.projects.updateProject({ userId: alice.id, workspaceId: alice.workspaceId, projectId: p.id, version: proj.version, data }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("platba ve stavu CREATED (jen přesměrování zpět) nic nepřipíše", async () => {
    const { gwUrl } = await m.payments.createOrder({
      workspaceId: alice.workspaceId,
      userId: alice.id,
      userEmail: alice.email,
      emailVerified: true,
      productCode: "PACK20",
    });
    const pid = new URL(gwUrl).searchParams.get("id")!;
    const before = await m.billing.creditBalance(alice.workspaceId);
    await m.payments.syncPayment(pid, "return");
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before);
  });

  it("zrušená platba: objednávka CANCELED, bez kreditu", async () => {
    const before = await m.billing.creditBalance(alice.workspaceId);
    const { orderId } = await pay(alice, "PACK20", undefined, "CANCELED");
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before);
    const order = await db.query.orders.findFirst({ where: eq(m.schema.orders.id, orderId) });
    expect(order?.status).toBe("CANCELED");
  });

  it("nesouhlasná částka v bráně → žádné připsání", async () => {
    const { gwUrl } = await m.payments.createOrder({
      workspaceId: alice.workspaceId,
      userId: alice.id,
      userEmail: alice.email,
      emailVerified: true,
      productCode: "PACK20",
    });
    const pid = new URL(gwUrl).searchParams.get("id")!;
    const mp = m.mock.MockGateway.get(pid)!;
    mp.amountHaler = 100; // podvržená částka
    m.mock.MockGateway.setState(pid, "PAID");
    const before = await m.billing.creditBalance(alice.workspaceId);
    const r = await m.payments.syncPayment(pid, "notify");
    expect(r?.kind).toBe("mismatch");
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before);
  });

  it("balíček 20: souběžné odemykání neodečte víc kreditů, než je projektů", async () => {
    const before = await m.billing.creditBalance(alice.workspaceId);
    await pay(alice, "PACK20");
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before + 20);
    const ps = await Promise.all([newProject(alice, "A"), newProject(alice, "B"), newProject(alice, "C")]);
    await Promise.all([
      ...ps.map((p) => m.billing.unlockProject({ workspaceId: alice.workspaceId, projectId: p.id, userId: alice.id })),
      m.billing.unlockProject({ workspaceId: alice.workspaceId, projectId: ps[0].id, userId: alice.id }),
      m.billing.unlockProject({ workspaceId: alice.workspaceId, projectId: ps[0].id, userId: alice.id }),
    ]);
    expect(await m.billing.creditBalance(alice.workspaceId)).toBe(before + 17);
  });

  it("neznámé ID platby v notifikaci nic neudělá", async () => {
    const id = m.mock.MockGateway.createRecurrence !== undefined ? "123" : "123";
    await expect(m.payments.syncPayment(id, "notify")).rejects.toThrow();
  });

  it("neověřený e-mail nemůže platit", async () => {
    await expect(
      m.payments.createOrder({
        workspaceId: alice.workspaceId,
        userId: alice.id,
        userEmail: alice.email,
        emailVerified: false,
        productCode: "SINGLE",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("předplatné", () => {
  let carol: TestUser;
  let parentPid: string;

  beforeAll(async () => {
    carol = await makeUser("carol@example.cz", "Carol");
  });

  it("aktivace po zaplacení a odemykání bez kreditů", async () => {
    const { pid } = await pay(carol, "SUB_PRO");
    parentPid = pid;
    const sub = await m.billing.activeSubscription(carol.workspaceId);
    expect(sub?.subscription.status).toBe("ACTIVE");
    const p = await newProject(carol);
    const unlock = await m.billing.unlockProject({ workspaceId: carol.workspaceId, projectId: p.id, userId: carol.id });
    expect(unlock.source).toBe("SUBSCRIPTION");
    expect(await m.billing.creditBalance(carol.workspaceId)).toBe(0);
  });

  it("druhé předplatné nelze koupit, dokud první běží", async () => {
    await expect(
      m.payments.createOrder({
        workspaceId: carol.workspaceId,
        userId: carol.id,
        userEmail: carol.email,
        emailVerified: true,
        productCode: "SUB_COMPANY",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("automatická obnova prodlouží období (i při opakované notifikaci jen jednou)", async () => {
    const before = (await m.billing.activeSubscription(carol.workspaceId))!.subscription.currentPeriodEnd!;
    const childId = m.mock.MockGateway.createRecurrence(parentPid, "PAID");
    await m.payments.syncPayment(childId, "notify", parentPid);
    await m.payments.syncPayment(childId, "notify", parentPid);
    const after = (await m.billing.activeSubscription(carol.workspaceId))!.subscription.currentPeriodEnd!;
    const days = (after.getTime() - before.getTime()) / 86400000;
    expect(days).toBeGreaterThanOrEqual(28);
    expect(days).toBeLessThanOrEqual(31);
  });

  it("limit odemčení za období – pak je potřeba kredit", async () => {
    await db.update(m.schema.products).set({ unlocksPerPeriod: 1 }).where(eq(m.schema.products.code, "SUB_PRO"));
    const p = await newProject(carol, "Druhý");
    await expect(m.billing.unlockProject({ workspaceId: carol.workspaceId, projectId: p.id, userId: carol.id })).rejects.toMatchObject({
      status: 402,
    });
    await db.update(m.schema.products).set({ unlocksPerPeriod: 30 }).where(eq(m.schema.products.code, "SUB_PRO"));
  });

  it("zrušení: zastaví opakování, předplatné platí do konce období", async () => {
    await m.payments.cancelSubscription(carol.workspaceId, carol.id);
    expect(m.mock.MockGateway.get(parentPid)?.recurrenceState).toBe("STOPPED");
    const sub = await m.billing.activeSubscription(carol.workspaceId);
    expect(sub?.subscription.status).toBe("CANCELED");
    // po konci období už neplatí
    await db
      .update(m.schema.subscriptions)
      .set({ currentPeriodEnd: new Date(Date.now() - 1000) })
      .where(eq(m.schema.subscriptions.workspaceId, carol.workspaceId));
    expect(await m.billing.activeSubscription(carol.workspaceId)).toBeNull();
  });
});

describe("vrácení platby", () => {
  it("refundace balíčku odebere kredity", async () => {
    const dave = await makeUser("dave@example.cz", "Dave");
    const { pid } = await pay(dave, "PACK20");
    expect(await m.billing.creditBalance(dave.workspaceId)).toBe(20);
    m.mock.MockGateway.setState(pid, "REFUNDED");
    await m.payments.syncPayment(pid, "notify");
    await m.payments.syncPayment(pid, "notify");
    expect(await m.billing.creditBalance(dave.workspaceId)).toBe(0);
  });
});

describe.skipIf(getVerificationSummaryForTest().fullyVerified)("blokace bez ověřeného jádra", () => {
  it("s REQUIRE_VERIFIED_CORE=true nelze platit ani odemknout", async () => {
    process.env.REQUIRE_VERIFIED_CORE = "true";
    m.config.resetConfigForTests();
    try {
      const p = await newProject(alice);
      await expect(m.billing.unlockProject({ workspaceId: alice.workspaceId, projectId: p.id, userId: alice.id })).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        m.payments.createOrder({
          workspaceId: alice.workspaceId,
          userId: alice.id,
          userEmail: alice.email,
          emailVerified: true,
          productCode: "SINGLE",
        }),
      ).rejects.toMatchObject({ status: 403 });
    } finally {
      process.env.REQUIRE_VERIFIED_CORE = "false";
      m.config.resetConfigForTests();
    }
  });
});

describe("výpočet projektu", () => {
  it("uloží výpočet s verzí jádra, otiskem vstupu a kontextem", async () => {
    const p = await newProject(alice, "Výpočet");
    const data = structuredClone(p.data) as { calc: unknown };
    data.calc = familyHouse();
    await m.projects.updateProject({ userId: alice.id, workspaceId: alice.workspaceId, projectId: p.id, version: 1, data });
    const res = await m.projects.runCalculation(alice.id, alice.workspaceId, p.id);
    expect(res.ok).toBe(true);
    const run = await m.projects.latestRun(p.id);
    expect(run?.coreVersion).toBeTruthy();
    expect(run?.inputHash).toHaveLength(64);
    expect(run?.verifiedCore).toBe(true);
  });

  it("neúplný vstup vrátí srozumitelné chyby", async () => {
    const p = await newProject(alice, "Neúplný");
    const res = await m.projects.runCalculation(alice.id, alice.workspaceId, p.id);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.issues.length).toBeGreaterThan(0);
  });
});

describe("ověřené jádro", () => {
  it("s REQUIRE_VERIFIED_CORE=true a ověřeným jádrem jsou platby povoleny", async () => {
    process.env.REQUIRE_VERIFIED_CORE = "true";
    m.config.resetConfigForTests();
    try {
      expect(m.billing.commerceAllowed().allowed).toBe(true);
    } finally {
      process.env.REQUIRE_VERIFIED_CORE = "false";
      m.config.resetConfigForTests();
    }
  });
});
