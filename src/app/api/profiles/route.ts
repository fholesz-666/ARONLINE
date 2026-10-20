import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { listProfiles, saveProfile } from "@/server/services/profiles";

export const GET = handler(async () => {
  const c = await requireMember();
  return json({ profiles: await listProfiles(c.workspaceId) });
});

export const POST = handler(async (req: Request) => {
  const c = await requireMember();
  const body = await readJson(req, z.object({ label: z.string().max(80), isDefault: z.boolean(), data: z.unknown() }));
  const p = await saveProfile(c.workspaceId, null, body);
  return json({ id: p.id }, { status: 201 });
});
