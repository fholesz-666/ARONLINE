import { startSession } from "@/server/auth/session";
import { clientIp, handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { createGuestUser, toPublicUser, zGuest } from "@/server/services/auth";

/** Pokračovat jako host – jednorázová analýza bez registrace. */
export const POST = handler(async (req: Request) => {
  await enforce(`guest:${clientIp(req)}`, LIMITS.register);
  await readJson(req, zGuest);
  const { user, workspace } = await createGuestUser();
  await startSession(user.id, workspace.id);
  return json({ user: toPublicUser(user) }, { status: 201 });
});
