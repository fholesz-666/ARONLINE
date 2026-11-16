import { clientIp, handler, json, readJson } from "@/server/http";
import { getProtocol, publicProtocol, updateProtocol, zVvSave } from "@/server/services/vv";
import { limitVvRead, vvToken } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const row = await getProtocol(id, vvToken(req));
  return json({ protocol: publicProtocol(row) });
});

/** Úprava protokolu (vyžaduje znovu potvrzení všech členů komise). */
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const body = await readJson(req, zVvSave, 500_000);
  await updateProtocol(id, vvToken(req) ?? "", body, clientIp(req));
  return json({ ok: true });
});
