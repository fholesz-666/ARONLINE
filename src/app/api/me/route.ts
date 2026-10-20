import { getCurrent } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { listWorkspaces } from "@/server/services/workspace";

export const GET = handler(async () => {
  const c = await getCurrent();
  if (!c) return json({ user: null });
  return json({ user: c.user, workspaceId: c.workspaceId, workspaces: await listWorkspaces(c.user.id) });
});
