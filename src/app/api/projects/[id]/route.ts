import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { getUnlock } from "@/server/services/billing";
import { deleteProject, updateProject } from "@/server/services/projects";
import { requireProjectAccess } from "@/server/services/workspace";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const p = await requireProjectAccess(c.user.id, c.workspaceId, id);
  const unlock = await getUnlock(id);
  return json({
    project: {
      id: p.id,
      name: p.name,
      status: p.status,
      version: p.version,
      methodologyId: p.methodologyId,
      data: p.data,
      objectLockedAt: p.objectLockedAt,
      updatedAt: p.updatedAt,
      unlocked: unlock != null,
    },
  });
});

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const body = await readJson(req, z.object({ version: z.number().int().positive(), data: z.unknown() }), 600_000);
  const r = await updateProject({ userId: c.user.id, workspaceId: c.workspaceId, projectId: id, version: body.version, data: body.data });
  return json({ version: r.version, updatedAt: r.updatedAt });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await deleteProject(c.user.id, c.workspaceId, id);
  return json({ ok: true });
});
