import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { familyHouse } from "@/core/risk/__tests__/fixtures";
import { setupTestDb, teardownTestDb } from "./setup";

let db: Awaited<ReturnType<typeof setupTestDb>>;
let m: {
  auth: typeof import("@/server/services/auth");
  projects: typeof import("@/server/services/projects");
  billing: typeof import("@/server/services/billing");
  exp: typeof import("@/server/documents/export");
  schema: typeof import("@/server/db/schema");
};

beforeAll(async () => {
  db = await setupTestDb();
  m = {
    auth: await import("@/server/services/auth"),
    projects: await import("@/server/services/projects"),
    billing: await import("@/server/services/billing"),
    exp: await import("@/server/documents/export"),
    schema: await import("@/server/db/schema"),
  };
});
afterAll(teardownTestDb);

describe("export dokumentace", () => {
  it("bez odemčení nelze stáhnout, po odemčení vznikne PDF i DOCX; cizí uživatel nic nestáhne", async () => {
    const { user, workspace } = await m.auth.registerUser({ email: "eva@example.cz", password: "Bezpecne-heslo-123", name: "Eva", acceptTerms: true });
    const other = await m.auth.registerUser({ email: "fero@example.cz", password: "Bezpecne-heslo-123", name: "Fero", acceptTerms: true });
    const p = await m.projects.createProject({ workspaceId: workspace.id, userId: user.id, name: "Export", buildingType: "family_house" });
    const data = structuredClone(p.data) as { calc: unknown; identification: { projectName: string } };
    data.calc = familyHouse();
    await m.projects.updateProject({ userId: user.id, workspaceId: workspace.id, projectId: p.id, version: 1, data });
    const calc = await m.projects.runCalculation(user.id, workspace.id, p.id);
    expect(calc.ok).toBe(true);

    await expect(m.exp.exportDocument({ userId: user.id, workspaceId: workspace.id, projectId: p.id, format: "PDF" })).rejects.toMatchObject({ status: 402 });

    // připsání kreditu (simulace zaplacené objednávky) a odemčení
    await db.transaction((tx) => m.billing.grantCredits(tx, { workspaceId: workspace.id, amount: 1, key: "test:export", note: "test" }));
    await m.billing.unlockProject({ workspaceId: workspace.id, projectId: p.id, userId: user.id });

    const pdf = await m.exp.exportDocument({ userId: user.id, workspaceId: workspace.id, projectId: p.id, format: "PDF" });
    expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.filename).toMatch(/\.pdf$/);
    const docx = await m.exp.exportDocument({ userId: user.id, workspaceId: workspace.id, projectId: p.id, format: "DOCX" });
    expect(docx.body.subarray(0, 2).toString()).toBe("PK");

    await expect(
      m.exp.exportDocument({ userId: other.user.id, workspaceId: other.workspace.id, projectId: p.id, format: "PDF" }),
    ).rejects.toMatchObject({ status: 404 });

    const logs = await db.query.exportLogs.findMany({ where: eq(m.schema.exportLogs.projectId, p.id) });
    expect(logs.length).toBe(2);
  });
});
