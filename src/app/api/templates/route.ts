import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { templates } from "@/server/db/schema";
import { badRequest, handler, json, readJson } from "@/server/http";
import { zInternalSystem, zLine, zZone } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";

const KIND_SCHEMA = {
  LINE: zLine.omit({ id: true }),
  ZONE: zZone.omit({ id: true }),
  INTERNAL_SYSTEM: zInternalSystem.omit({ id: true, lineId: true }),
  PROJECT: z.record(z.unknown()),
} as const;

export const GET = handler(async (req: Request) => {
  const c = await requireMember();
  const kind = new URL(req.url).searchParams.get("kind");
  const where =
    kind && kind in KIND_SCHEMA
      ? and(eq(templates.workspaceId, c.workspaceId), eq(templates.kind, kind as keyof typeof KIND_SCHEMA))
      : eq(templates.workspaceId, c.workspaceId);
  const rows = await getDb().query.templates.findMany({ where, orderBy: (t, { asc }) => [asc(t.name)] });
  return json({ templates: rows.map((r) => ({ id: r.id, kind: r.kind, name: r.name, data: r.data })) });
});

export const POST = handler(async (req: Request) => {
  const c = await requireMember();
  const body = await readJson(
    req,
    z.object({ kind: z.enum(["LINE", "ZONE", "INTERNAL_SYSTEM", "PROJECT"]), name: z.string().trim().min(1).max(120), data: z.unknown() }),
  );
  const parsed = KIND_SCHEMA[body.kind].safeParse(body.data);
  if (!parsed.success) throw badRequest("Šablonu nelze uložit – údaje nejsou úplné.");
  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(templates).where(eq(templates.workspaceId, c.workspaceId));
  if (n >= 200) throw badRequest("Maximální počet šablon je 200.");
  const [row] = await db.insert(templates).values({ workspaceId: c.workspaceId, kind: body.kind, name: body.name, data: parsed.data }).returning();
  return json({ id: row.id }, { status: 201 });
});
