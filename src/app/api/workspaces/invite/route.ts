import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { zEmail } from "@/server/services/auth";
import { inviteMember } from "@/server/services/workspace";

export const POST = handler(async (req: Request) => {
  const c = await requireMember("ADMIN");
  const body = await readJson(req, z.object({ email: zEmail, role: z.enum(["ADMIN", "MEMBER"]) }));
  await enforce(`invite:${c.workspaceId}`, LIMITS.register);
  await inviteMember(c.workspaceId, c.user.id, body.email, body.role);
  return json({ ok: true });
});
