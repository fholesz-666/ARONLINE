import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { restoreRevision } from "@/server/services/projects";

type Ctx = { params: Promise<{ id: string; revId: string }> };

/** Obnovení revize (aktuální stav se předtím uloží jako nová revize). */
export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id, revId } = await ctx.params;
  const r = await restoreRevision(c.user.id, c.workspaceId, id, revId);
  return json({ ok: true, version: r.version });
});
