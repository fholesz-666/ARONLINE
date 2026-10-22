import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { adjustCredits } from "@/server/services/admin";

export const POST = handler(async (req: Request) => {
  const c = await requireAdmin();
  const body = await readJson(
    req,
    z.object({
      workspaceId: z.string().max(60),
      delta: z.number().int().min(-10_000).max(10_000),
      note: z.string().max(200).default(""),
    }),
  );
  await adjustCredits({ ...body, note: body.note ?? "", adminId: c.user.id });
  return json({ ok: true });
});
