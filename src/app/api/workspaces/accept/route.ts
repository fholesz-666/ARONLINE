import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { setSessionWorkspace } from "@/server/services/auth";
import { acceptInvitation } from "@/server/services/workspace";

export const POST = handler(async (req: Request) => {
  const c = await requireUser();
  const { token } = await readJson(req, z.object({ token: z.string().min(10).max(200) }));
  const workspaceId = await acceptInvitation(c.user.id, c.user.email, token);
  await setSessionWorkspace(c.sessionId, workspaceId);
  return json({ ok: true });
});
