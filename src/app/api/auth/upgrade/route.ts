import { requireUser } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { toPublicUser, upgradeGuest, zUpgradeGuest } from "@/server/services/auth";

/** Host dokončí registraci – zachová projekty i zakoupené analýzy. */
export const POST = handler(async (req: Request) => {
  const c = await requireUser();
  await enforce(`register:${c.user.id}`, LIMITS.register);
  const body = await readJson(req, zUpgradeGuest);
  const user = await upgradeGuest(c.user.id, body);
  return json({ user: toPublicUser(user) });
});
