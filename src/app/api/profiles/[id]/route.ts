import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { deleteProfile, saveProfile } from "@/server/services/profiles";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const body = await readJson(req, z.object({ label: z.string().max(80), isDefault: z.boolean(), data: z.unknown() }));
  await saveProfile(c.workspaceId, id, body);
  return json({ ok: true });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await deleteProfile(c.workspaceId, id);
  return json({ ok: true });
});
