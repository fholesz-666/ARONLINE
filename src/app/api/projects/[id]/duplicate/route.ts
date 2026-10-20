import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { duplicateProject } from "@/server/services/projects";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const p = await duplicateProject(c.user.id, c.workspaceId, id);
  return json({ id: p.id }, { status: 201 });
});
