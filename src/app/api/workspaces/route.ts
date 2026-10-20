import { z } from "zod";
import { requireRegistered } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { setSessionWorkspace } from "@/server/services/auth";
import { createCompanyWorkspace, listMembers, listWorkspaces } from "@/server/services/workspace";

export const GET = handler(async () => {
  const c = await requireRegistered();
  const workspaces = await listWorkspaces(c.user.id);
  const current = workspaces.find((w) => w.workspaceId === c.workspaceId) ?? null;
  return json({ workspaces, current, members: current ? await listMembers(current.workspaceId) : [] });
});

export const POST = handler(async (req: Request) => {
  const c = await requireRegistered();
  const { name } = await readJson(req, z.object({ name: z.string().trim().min(2).max(120) }));
  const ws = await createCompanyWorkspace(c.user.id, name);
  await setSessionWorkspace(c.sessionId, ws.id);
  return json({ id: ws.id }, { status: 201 });
});
