import { clientIp, handler, json, readJson } from "@/server/http";
import { creditBalance } from "@/server/services/billing";
import { claimProtocol, getProtocol, publicProtocol, updateProtocol, zVvSave } from "@/server/services/vv";
import { limitVvRead, vvToken, vvViewer } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const viewer = await vvViewer();
  let row = await getProtocol(id, vvToken(req), viewer?.userId);
  row = await claimProtocol(row, viewer?.userId);
  const credits = viewer?.workspaceId ? await creditBalance(viewer.workspaceId) : 0;
  return json({
    protocol: publicProtocol(row),
    viewer: { loggedIn: !!viewer, isOwner: !!viewer && row.userId === viewer.userId, credits },
  });
});

/** Úprava protokolu (vyžaduje znovu potvrzení všech členů komise). */
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const body = await readJson(req, zVvSave, 500_000);
  const viewer = await vvViewer();
  await updateProtocol(id, vvToken(req), body, clientIp(req), viewer?.userId);
  return json({ ok: true });
});
