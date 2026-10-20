import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb, teardownTestDb } from "./setup";

let auth: typeof import("@/server/services/auth");
let mail: typeof import("@/server/mail");

beforeAll(async () => {
  await setupTestDb();
  auth = await import("@/server/services/auth");
  mail = await import("@/server/mail");
});
afterAll(teardownTestDb);

const lastLink = (to: string) => {
  const m = [...mail.testOutbox].reverse().find((x) => x.to === to);
  const match = m?.text.match(/token=([A-Za-z0-9_\-%]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

describe("registrace a přihlášení", () => {
  it("odmítne slabé heslo", async () => {
    await expect(
      auth.registerUser({ email: "a@example.cz", password: "kratke", name: "Alice", acceptTerms: true }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("registrace vytvoří účet, workspace a pošle ověřovací e-mail", async () => {
    const { user, workspace } = await auth.registerUser({
      email: "Alice@Example.cz",
      password: "Bezpecne-heslo-123",
      name: "Alice Nováková",
      acceptTerms: true,
    });
    expect(user.email).toBe("alice@example.cz");
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(workspace.type).toBe("PERSONAL");
    expect(lastLink("alice@example.cz")).toBeTruthy();
  });

  it("duplicitní e-mail vrací konflikt", async () => {
    await expect(
      auth.registerUser({ email: "alice@example.cz", password: "Bezpecne-heslo-123", name: "X", acceptTerms: true }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("přihlášení se správným a špatným heslem", async () => {
    expect(await auth.authenticate("ALICE@example.cz", "Bezpecne-heslo-123")).not.toBeNull();
    expect(await auth.authenticate("alice@example.cz", "spatne-heslo-123")).toBeNull();
    expect(await auth.authenticate("nikdo@example.cz", "Bezpecne-heslo-123")).toBeNull();
  });

  it("relace: token v DB jen jako hash, neplatný token nic nevrací", async () => {
    const user = (await auth.authenticate("alice@example.cz", "Bezpecne-heslo-123"))!;
    const { token } = await auth.createSessionRecord(user.id, null);
    const row = await auth.resolveSession(token);
    expect(row?.user.id).toBe(user.id);
    expect(row?.session.tokenHash).not.toBe(token);
    expect(await auth.resolveSession(token + "x")).toBeNull();
    await auth.deleteSession(token);
    expect(await auth.resolveSession(token)).toBeNull();
  });

  it("ověření e-mailu – token lze použít jen jednou", async () => {
    const token = lastLink("alice@example.cz")!;
    expect(await auth.verifyEmail(token)).toBe(true);
    expect(await auth.verifyEmail(token)).toBe(false);
  });

  it("obnova hesla zneplatní relace a změní heslo", async () => {
    const user = (await auth.authenticate("alice@example.cz", "Bezpecne-heslo-123"))!;
    const { token: sessionToken } = await auth.createSessionRecord(user.id, null);
    await auth.requestPasswordReset("alice@example.cz");
    const resetToken = lastLink("alice@example.cz")!;
    expect(await auth.resetPassword(resetToken, "Nove-Heslo-456")).toBe(true);
    expect(await auth.resolveSession(sessionToken)).toBeNull();
    expect(await auth.authenticate("alice@example.cz", "Nove-Heslo-456")).not.toBeNull();
    expect(await auth.resetPassword(resetToken, "Jine-Heslo-789")).toBe(false);
  });

  it("žádost o obnovu pro neexistující e-mail nic neprozradí ani nepošle", async () => {
    const before = mail.testOutbox.length;
    await auth.requestPasswordReset("neexistuje@example.cz");
    expect(mail.testOutbox.length).toBe(before);
  });
});
