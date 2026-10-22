import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { updateUser } from "@/server/services/admin";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireAdmin();
  const { id } = await ctx.params;
  const { action } = await readJson(req, z.object({ action: z.enum(["disable", "enable", "verify", "make_admin", "make_user"]) }));
  await updateUser(id, action, c.user.id);
  return json({ ok: true });
});
