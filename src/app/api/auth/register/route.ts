import { startSession } from "@/server/auth/session";
import { clientIp, handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { registerUser, toPublicUser, zRegister } from "@/server/services/auth";

export const POST = handler(async (req: Request) => {
  await enforce(`register:${clientIp(req)}`, LIMITS.register);
  const body = await readJson(req, zRegister);
  const { user, workspace } = await registerUser(body);
  await startSession(user.id, workspace.id);
  return json({ user: toPublicUser(user) }, { status: 201 });
});
