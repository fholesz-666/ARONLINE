import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { setInvoiceCanceled } from "@/server/services/admin";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireAdmin();
  const { id } = await ctx.params;
  const { canceled } = await readJson(req, z.object({ canceled: z.boolean() }));
  await setInvoiceCanceled(id, canceled, c.user.id);
  return json({ ok: true });
});
