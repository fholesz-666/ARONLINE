import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb, teardownTestDb } from "./setup";

type Mods = {
  auth: typeof import("@/server/services/auth");
  projects: typeof import("@/server/services/projects");
  billing: typeof import("@/server/services/billing");
  payments: typeof import("@/server/payments/service");
  mock: typeof import("@/server/payments/mock");
  admin: typeof import("@/server/services/admin");
  invoices: typeof import("@/server/services/invoices");
  settings: typeof import("@/server/services/settings");
  schema: typeof import("@/server/db/schema");
  mail: typeof import("@/server/mail");
  pdf: typeof import("@/server/documents/invoice-pdf");
};
let m: Mods;
let db: Awaited<ReturnType<typeof setupTestDb>>;

interface TestUser {
  id: string;
  email: string;
  workspaceId: string;
}

async function makeUser(email: string, name: string, verified = true): Promise<TestUser> {
  const { user, workspace } = await m.auth.registerUser({ email, password: "Bezpecne-heslo-123", name, acceptTerms: true });
  if (verified) await db.update(m.schema.users).set({ emailVerifiedAt: new Date() }).where(eq(m.schema.users.id, user.id));
  return { id: user.id, email, workspaceId: workspace.id };
}

const base = (u: TestUser) => ({ workspaceId: u.workspaceId, userId: u.id, userEmail: u.email, emailVerified: true });
const newProject = (u: TestUser) => m.projects.createProject({ workspaceId: u.workspaceId, userId: u.id, name: "Test", buildingType: "family_house" });

let admin: TestUser;
let dana: TestUser;

beforeAll(async () => {
  db = await setupTestDb();
  m = {
    auth: await import("@/server/services/auth"),
    projects: await import("@/server/services/projects"),
    billing: await import("@/server/services/billing"),
    payments: await import("@/server/payments/service"),
    mock: await import("@/server/payments/mock"),
    admin: await import("@/server/services/admin"),
    invoices: await import("@/server/services/invoices"),
    settings: await import("@/server/services/settings"),
    schema: await import("@/server/db/schema"),
    mail: await import("@/server/mail"),
    pdf: await import("@/server/documents/invoice-pdf"),
  };
  admin = await makeUser("spravce@example.cz", "Správce");
  await db.update(m.schema.users).set({ role: "ADMIN" }).where(eq(m.schema.users.id, admin.id));
  dana = await makeUser("dana@example.cz", "Dana");
  await m.settings.saveSettings(
    {
      operator: {
        name: "Filip Holesz",
        ico: "09000461",
        dic: "",
        address: "Testovací 1, 110 00 Praha",
        email: "info@aronline.cz",
        phone: "+420 777 000 000",
        registry: "Zapsán v živnostenském rejstříku.",
        vatPayer: false,
      },
      bank: { enabled: true, account: "242406724/0300", dueDays: 7 },
    },
    admin.id,
  );
});
afterAll(teardownTestDb);

describe("nastavení webu", () => {
  it("uloží provozovatele a účet, spočítá IBAN; neplatný účet odmítne", async () => {
    const s = await m.settings.getSettings();
    expect(s.operator.ico).toBe("09000461");
    expect(s.bank.iban).toBe("CZ8903000000000242406724");
    expect(s.bank.accountValid).toBe(true);
    await expect(m.settings.saveSettings({ bank: { enabled: true, account: "123456789/0300", dueDays: 7 } }, admin.id)).rejects.toMatchObject({ status: 400 });
  });

  it("texty: prázdná hodnota = výchozí, neznámé klíče se ignorují", async () => {
    await m.settings.saveSettings({ texts: { homeTitle: "Nový nadpis", footerAbout: "", hack: "x" } }, admin.id);
    const s = await m.settings.getSettings();
    expect(s.texts.homeTitle).toBe("Nový nadpis");
    expect(s.texts.footerAbout).toMatch(/Analýza rizika/);
    expect(await m.settings.getStoredTexts()).not.toHaveProperty("hack");
  });
});

describe("platba převodem a doklady", () => {
  it("objednávka převodem → potvrzení správcem → kredit, odemčení, doklad, e-mail s PDF", async () => {
    const p = await newProject(dana);
    m.mail.testOutbox.length = 0;
    const { orderId } = await m.payments.createBankOrder({ ...base(dana), productCode: "SINGLE", projectId: p.id });
    const order = await db.query.orders.findFirst({ where: eq(m.schema.orders.id, orderId) });
    expect(order?.paymentMethod).toBe("BANK");
    expect(order?.variableSymbol).toMatch(/^\d{10}$/);
    expect(order?.status).toBe("PENDING");
    expect(m.mail.testOutbox.at(-1)?.text).toContain("242406724/0300");
    expect(await m.billing.getUnlock(p.id)).toBeNull();

    const r = await m.payments.confirmBankPayment(orderId, admin.id);
    expect(r.alreadyPaid).toBe(false);
    expect((await m.billing.getUnlock(p.id))?.source).toBe("CREDIT");
    const invs = await m.invoices.listInvoices(dana.workspaceId);
    expect(invs).toHaveLength(1);
    expect(invs[0].number).toMatch(/^\d{4}0001$/);
    expect(invs[0].totalHaler).toBe(14900);
    expect((invs[0].supplier as { ico: string }).ico).toBe("09000461");
    expect(invs[0].note).toContain("není plátcem DPH");
    const mail = m.mail.testOutbox.find((x) => x.subject.startsWith("Platba přijata"));
    expect(mail?.attachments?.[0].filename).toBe(`doklad-${invs[0].number}.pdf`);
    expect(mail!.attachments![0].content.subarray(0, 4).toString()).toBe("%PDF");

    // opakované potvrzení nic nezdvojí
    expect((await m.payments.confirmBankPayment(orderId, admin.id)).alreadyPaid).toBe(true);
    expect(await m.invoices.listInvoices(dana.workspaceId)).toHaveLength(1);
  });

  it("předplatné převodem nelze", async () => {
    await expect(m.payments.createBankOrder({ ...base(dana), productCode: "SUB_PRO" })).rejects.toMatchObject({ status: 400 });
  });

  it("platba kartou vystaví doklad s další číslem řady", async () => {
    const { gwUrl } = await m.payments.createOrder({ ...base(dana), productCode: "PACK20" });
    const pid = new URL(gwUrl).searchParams.get("id")!;
    m.mock.MockGateway.setState(pid, "PAID");
    await m.payments.syncPayment(pid, "notify");
    await m.payments.syncPayment(pid, "return");
    const invs = await m.invoices.listInvoices(dana.workspaceId);
    expect(invs).toHaveLength(2);
    expect(invs.map((i) => i.seq).sort()).toEqual([1, 2]);
    expect(invs.find((i) => i.seq === 2)?.paymentMethod).toBe("CARD");
  });

  it("doklad stáhne jen člen prostoru nebo správce", async () => {
    const other = await makeUser("eva@example.cz", "Eva");
    const [inv] = await m.invoices.listInvoices(dana.workspaceId);
    await expect(m.invoices.getInvoiceFor(inv.id, { userId: other.id, isAdmin: false })).rejects.toMatchObject({ status: 403 });
    expect((await m.invoices.getInvoiceFor(inv.id, { userId: dana.id, isAdmin: false })).id).toBe(inv.id);
    expect((await m.invoices.getInvoiceFor(inv.id, { userId: admin.id, isAdmin: true })).id).toBe(inv.id);
    const pdf = await m.pdf.renderInvoicePdf(inv);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("zákazník může zrušit jen svou nezaplacenou objednávku", async () => {
    const other = await makeUser("filip@example.cz", "Filip");
    const { orderId } = await m.payments.createBankOrder({ ...base(dana), productCode: "PACK20" });
    await expect(m.payments.cancelPendingOrder(orderId, { userId: other.id, workspaceId: other.workspaceId, isAdmin: false })).rejects.toMatchObject({ status: 404 });
    await m.payments.cancelPendingOrder(orderId, { userId: dana.id, workspaceId: dana.workspaceId, isAdmin: false });
    const o = await db.query.orders.findFirst({ where: eq(m.schema.orders.id, orderId) });
    expect(o?.status).toBe("CANCELED");
  });
});

describe("opakované platby – souhlas (GoPay)", () => {
  it("předplatné bez souhlasu nelze objednat; souhlas a parametry se uloží", async () => {
    const u = await makeUser("gabriela@example.cz", "Gabriela");
    await expect(m.payments.createOrder({ ...base(u), productCode: "SUB_PRO" })).rejects.toMatchObject({ status: 400 });
    m.mail.testOutbox.length = 0;
    const { gwUrl, orderId } = await m.payments.createOrder({ ...base(u), productCode: "SUB_PRO", recurrenceConsent: true, clientIp: "203.0.113.5" });
    const order = await db.query.orders.findFirst({ where: eq(m.schema.orders.id, orderId) });
    const rec = (order?.consents as { recurrence: { version: string; ip: string; terms: { label: string; value: string }[] } }).recurrence;
    expect(rec.ip).toBe("203.0.113.5");
    expect(rec.terms.map((t) => t.label)).toEqual(
      expect.arrayContaining(["Důvod opakované platby", "Částka", "Frekvence a datum stržení", "Doba trvání", "Změna nastavení", "Zrušení"]),
    );
    const pid = new URL(gwUrl).searchParams.get("id")!;
    expect(m.mock.MockGateway.get(pid)?.recurrence?.cycle).toBe("MONTH");
    m.mock.MockGateway.setState(pid, "PAID");
    await m.payments.syncPayment(pid, "notify");
    expect(m.mail.testOutbox.some((x) => x.subject.startsWith("Opakovaná platba založena"))).toBe(true);

    // obnova předplatného → další doklad s obdobím
    const childId = m.mock.MockGateway.createRecurrence(pid);
    await m.payments.syncPayment(childId, "notify", pid);
    const invs = await m.invoices.listInvoices(u.workspaceId);
    expect(invs).toHaveLength(2);
    expect((invs[0].items as { name: string }[])[0].name).toMatch(/období/);

    m.mail.testOutbox.length = 0;
    await m.payments.cancelSubscription(u.workspaceId, u.id);
    expect(m.mail.testOutbox.some((x) => x.subject.startsWith("Předplatné zrušeno"))).toBe(true);
  });
});

describe("správa", () => {
  it("správce odemyká bez platby a bez kreditu", async () => {
    const p = await newProject(admin);
    expect(await m.billing.creditBalance(admin.workspaceId)).toBe(0);
    const u = await m.billing.unlockProject({ workspaceId: admin.workspaceId, projectId: p.id, userId: admin.id, asAdmin: true });
    expect(u.source).toBe("ADMIN");
    expect(await m.billing.creditBalance(admin.workspaceId)).toBe(0);
  });

  it("běžný uživatel bez kreditu odemknout nemůže", async () => {
    const u = await makeUser("hana@example.cz", "Hana");
    const p = await newProject(u);
    await expect(m.billing.unlockProject({ workspaceId: u.workspaceId, projectId: p.id, userId: u.id })).rejects.toMatchObject({ status: 402 });
  });

  it("připsání a odebrání kreditů, blokace a role", async () => {
    await m.admin.adjustCredits({ workspaceId: dana.workspaceId, delta: 5, note: "Dárek", adminId: admin.id });
    const before = await m.billing.creditBalance(dana.workspaceId);
    await m.admin.adjustCredits({ workspaceId: dana.workspaceId, delta: -2, note: "", adminId: admin.id });
    expect(await m.billing.creditBalance(dana.workspaceId)).toBe(before - 2);
    await expect(m.admin.adjustCredits({ workspaceId: dana.workspaceId, delta: 0, note: "", adminId: admin.id })).rejects.toMatchObject({ status: 400 });

    await m.admin.updateUser(dana.id, "disable", admin.id);
    expect(await m.auth.authenticate(dana.email, "Bezpecne-heslo-123")).toBeNull();
    await m.admin.updateUser(dana.id, "enable", admin.id);
    expect(await m.auth.authenticate(dana.email, "Bezpecne-heslo-123")).not.toBeNull();
    await expect(m.admin.updateUser(admin.id, "disable", admin.id)).rejects.toMatchObject({ status: 400 });

    const list = await m.admin.listUsers({ q: "dana" });
    expect(list.users[0].workspaces[0].balance).toBe(before - 2);
    const ov = await m.admin.adminOverview();
    expect(ov.users).toBeGreaterThan(3);
    const orders = await m.admin.listAllOrders({ method: "BANK" });
    expect(orders.every((o) => o.paymentMethod === "BANK")).toBe(true);
    const csv = m.admin.invoicesCsv(await m.admin.listAllInvoices({}));
    expect(csv).toContain("Číslo;Vystaveno");
  });

  it("vlastník služby získá roli správce až po ověření e-mailu", async () => {
    const owner = await makeUser("fholesz@gmail.com", "Filip Holesz", false);
    const row = await db.query.users.findFirst({ where: eq(m.schema.users.id, owner.id) });
    // role ADMIN z registrace platí až s ověřeným e-mailem (requireAdmin)
    expect(row?.emailVerifiedAt).toBeNull();
    await db.update(m.schema.users).set({ role: "USER" }).where(eq(m.schema.users.id, owner.id));
    await db.update(m.schema.users).set({ emailVerifiedAt: new Date() }).where(eq(m.schema.users.id, owner.id));
    const u = await m.auth.authenticate("fholesz@gmail.com", "Bezpecne-heslo-123");
    expect(u?.role).toBe("ADMIN");
  });
});
