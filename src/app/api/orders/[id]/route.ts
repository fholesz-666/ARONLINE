import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { cancelPendingOrder } from "@/server/payments/service";

type Ctx = { params: Promise<{ id: string }> };

/** Zrušení vlastní nezaplacené objednávky (převodem). */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await cancelPendingOrder(id, { userId: c.user.id, workspaceId: c.workspaceId, isAdmin: false });
  return json({ ok: true });
});
