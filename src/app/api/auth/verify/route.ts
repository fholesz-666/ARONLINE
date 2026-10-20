import { z } from "zod";
import { badRequest, handler, json, readJson } from "@/server/http";
import { verifyEmail } from "@/server/services/auth";

export const POST = handler(async (req: Request) => {
  const { token } = await readJson(req, z.object({ token: z.string().min(10).max(200) }));
  if (!(await verifyEmail(token))) throw badRequest("Odkaz pro ověření je neplatný nebo již byl použit.");
  return json({ ok: true });
});
