import { z } from "zod";
import { badRequest, clientIp, handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { resetPassword } from "@/server/services/auth";

export const POST = handler(async (req: Request) => {
  const body = await readJson(req, z.object({ token: z.string().min(10).max(200), password: z.string().max(200) }));
  await enforce(`reset-confirm:${clientIp(req)}`, LIMITS.passwordReset);
  const ok = await resetPassword(body.token, body.password);
  if (!ok) throw badRequest("Odkaz pro obnovení hesla je neplatný nebo vypršel. Požádejte o nový.");
  return json({ ok: true });
});
