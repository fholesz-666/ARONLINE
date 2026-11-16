import { forbidden, handler, json } from "@/server/http";
import { redeemWithCredit } from "@/server/services/vv";
import { limitVvRead, vvToken, vvViewer } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

/** Odemknutí placené verze protokolu 1 kreditem z účtu přihlášeného uživatele. */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const viewer = await vvViewer();
  if (!viewer?.workspaceId) throw forbidden("Pro uplatnění kreditu se přihlaste.");
  await redeemWithCredit(id, vvToken(req), { userId: viewer.userId, workspaceId: viewer.workspaceId });
  return json({ ok: true });
});
