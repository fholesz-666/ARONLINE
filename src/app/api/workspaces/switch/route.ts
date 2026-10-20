import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { forbidden, handler, json, readJson } from "@/server/http";
import { setSessionWorkspace } from "@/server/services/auth";
import { getMembership } from "@/server/services/workspace";

export const POST = handler(async (req: Request) => {
  const c = await requireUser();
  const { workspaceId } = await readJson(req, z.object({ workspaceId: z.string().max(60) }));
  if (!(await getMembership(c.user.id, workspaceId))) throw forbidden();
  await setSessionWorkspace(c.sessionId, workspaceId);
  return json({ ok: true });
});
