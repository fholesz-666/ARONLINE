import { and, eq } from "drizzle-orm";
import { requireMember } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { templates } from "@/server/db/schema";
import { handler, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await getDb().delete(templates).where(and(eq(templates.id, id), eq(templates.workspaceId, c.workspaceId)));
  return json({ ok: true });
});
