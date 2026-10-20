import { z } from "zod";
import { audit } from "@/server/audit";
import { startSession } from "@/server/auth/session";
import { clientIp, handler, HttpError, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { authenticate, defaultWorkspaceId, toPublicUser } from "@/server/services/auth";

const zLogin = z.object({ email: z.string().max(254), password: z.string().max(200) });

export const POST = handler(async (req: Request) => {
  const body = await readJson(req, zLogin);
  await enforce(`login:ip:${clientIp(req)}`, LIMITS.login);
  await enforce(`login:email:${body.email.trim().toLowerCase()}`, LIMITS.login);
  const user = await authenticate(body.email, body.password);
  if (!user) throw new HttpError(401, "invalid_credentials", "Nesprávný e-mail nebo heslo.");
  await startSession(user.id, await defaultWorkspaceId(user.id));
  await audit("user.login", { userId: user.id });
  return json({ user: toPublicUser(user) });
});
