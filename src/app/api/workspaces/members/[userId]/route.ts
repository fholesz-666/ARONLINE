import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { removeMember } from "@/server/services/workspace";

type Ctx = { params: Promise<{ userId: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember("ADMIN");
  const { userId } = await ctx.params;
  await removeMember(c.workspaceId, c.user.id, userId);
  return json({ ok: true });
});
