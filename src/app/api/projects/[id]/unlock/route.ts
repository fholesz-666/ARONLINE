import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { unlockProject } from "@/server/services/billing";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const u = await unlockProject({ workspaceId: c.workspaceId, projectId: id, userId: c.user.id });
  return json({ ok: true, source: u.source });
});
