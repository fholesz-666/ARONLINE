import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { listRevisions, saveRevision } from "@/server/services/projects";
import { requireProjectAccess } from "@/server/services/workspace";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  return json({ revisions: await listRevisions(c.user.id, c.workspaceId, id) });
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const { note } = await readJson(req, z.object({ note: z.string().trim().min(1).max(200) }));
  const p = await requireProjectAccess(c.user.id, c.workspaceId, id);
  await saveRevision(id, c.user.id, p.version, p.data, note);
  return json({ ok: true }, { status: 201 });
});
