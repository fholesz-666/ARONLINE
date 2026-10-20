import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { changePassword } from "@/server/services/auth";

export const POST = handler(async (req: Request) => {
  const c = await requireUser();
  const body = await readJson(req, z.object({ currentPassword: z.string().max(200), newPassword: z.string().max(200) }));
  await enforce(`password-change:${c.user.id}`, LIMITS.login);
  await changePassword(c.user.id, body.currentPassword, body.newPassword);
  return json({ ok: true });
});
