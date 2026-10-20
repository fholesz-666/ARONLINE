import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb, teardownTestDb } from "./setup";

type Mods = {
  auth: typeof import("@/server/services/auth");
  projects: typeof import("@/server/services/projects");
  billing: typeof import("@/server/services/billing");
  payments: typeof import("@/server/payments/service");
  mock: typeof import("@/server/payments/mock");
  schema: typeof import("@/server/db/schema");
};
let m: Mods;
let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
  m = {
    auth: await import("@/server/services/auth"),
    projects: await import("@/server/services/projects"),
    billing: await import("@/server/services/billing"),
    payments: await import("@/server/payments/service"),
    mock: await import("@/server/payments/mock"),
    schema: await import("@/server/db/schema"),
  };
});
afterAll(teardownTestDb);

describe("host bez registrace", () => {
  it("smí koupit jen jednorázovou analýzu ke konkrétnímu projektu", async () => {
    const { user, workspace } = await m.auth.createGuestUser();
    expect(user.isGuest).toBe(true);
    expect(m.auth.toPublicUser(user).email).toBe("");
    const p = await m.projects.createProject({ workspaceId: workspace.id, userId: user.id, name: "RD", buildingType: "family_house" });
    const base = { workspaceId: workspace.id, userId: user.id, emailVerified: false, isGuest: true };

    await expect(m.payments.createOrder({ ...base, userEmail: "host@example.cz", productCode: "PACK20" })).rejects.toMatchObject({ status: 403 });
    await expect(m.payments.createOrder({ ...base, userEmail: "host@example.cz", productCode: "SUB_PRO" })).rejects.toMatchObject({ status: 403 });
    await expect(m.payments.createOrder({ ...base, userEmail: "host@example.cz", productCode: "SINGLE" })).rejects.toMatchObject({ status: 400 });
    await expect(m.payments.createOrder({ ...base, userEmail: user.email, productCode: "SINGLE", projectId: p.id })).rejects.toMatchObject({ status: 400 });

    const { gwUrl } = await m.payments.createOrder({ ...base, userEmail: "host@example.cz", productCode: "SINGLE", projectId: p.id });
    const pid = new URL(gwUrl).searchParams.get("id")!;
    m.mock.MockGateway.setState(pid, "PAID");
    await m.payments.syncPayment(pid, "notify");
    expect(await m.billing.getUnlock(p.id)).not.toBeNull();
  });

  it("nelze se přihlásit heslem ani obnovit heslo; registraci lze dokončit se zachováním projektů", async () => {
    const { user, workspace } = await m.auth.createGuestUser();
    expect(await m.auth.authenticate(user.email, "cokoli")).toBeNull();
    const p = await m.projects.createProject({ workspaceId: workspace.id, userId: user.id, name: "Škola", buildingType: "family_house" });
    const up = await m.auth.upgradeGuest(user.id, { email: "novy@example.cz", password: "Bezpecne-heslo-123", name: "Nový Uživatel" });
    expect(up.isGuest).toBe(false);
    expect((await m.auth.authenticate("novy@example.cz", "Bezpecne-heslo-123"))?.id).toBe(user.id);
    const row = await db.query.projects.findFirst({ where: eq(m.schema.projects.id, p.id) });
    expect(row?.workspaceId).toBe(workspace.id);
    await expect(m.auth.upgradeGuest(user.id, { email: "x@example.cz", password: "Bezpecne-heslo-123", name: "X" })).rejects.toMatchObject({ status: 400 });
  });

  it("úklid maže jen neaktivní hosty bez objednávek", async () => {
    const { user } = await m.auth.createGuestUser();
    const old = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    await db.update(m.schema.users).set({ createdAt: old }).where(eq(m.schema.users.id, user.id));
    const n = await m.auth.purgeStaleGuests();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await db.query.users.findFirst({ where: eq(m.schema.users.id, user.id) })).toBeUndefined();
  });
});
