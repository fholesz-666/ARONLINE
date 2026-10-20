import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { createProject, listProjects } from "@/server/services/projects";

export const GET = handler(async () => {
  const c = await requireMember();
  return json({ projects: await listProjects(c.workspaceId) });
});

export const POST = handler(async (req: Request) => {
  const c = await requireMember();
  const body = await readJson(
    req,
    z.object({ name: z.string().trim().min(1, "Zadejte název projektu").max(200), buildingType: z.string().max(40) }),
  );
  const p = await createProject({ workspaceId: c.workspaceId, userId: c.user.id, name: body.name, buildingType: body.buildingType });
  return json({ id: p.id }, { status: 201 });
});
