import { z } from "zod";
import { clientIp, handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { requestPasswordReset } from "@/server/services/auth";

export const POST = handler(async (req: Request) => {
  const { email } = await readJson(req, z.object({ email: z.string().max(254) }));
  await enforce(`reset:ip:${clientIp(req)}`, LIMITS.passwordReset);
  await enforce(`reset:email:${email.trim().toLowerCase()}`, LIMITS.passwordReset);
  await requestPasswordReset(email);
  // Stejná odpověď bez ohledu na existenci účtu
  return json({ ok: true });
});
