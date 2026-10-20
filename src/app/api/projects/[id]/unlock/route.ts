import { z } from "zod";
import { LIABILITY_VERSION } from "@/config/liability";
import { audit } from "@/server/audit";
import { requireMember } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { unlockProject } from "@/server/services/billing";

type Ctx = { params: Promise<{ id: string }> };

const zLiability = z.object({
  acceptLiability: z.literal(true, {
    errorMap: () => ({ message: "Potvrďte prosím prohlášení o odpovědnosti zpracovatele." }),
  }),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await readJson(req, zLiability);
  await audit("project.liability_accepted", {
    userId: c.user.id,
    workspaceId: c.workspaceId,
    meta: { projectId: id, version: LIABILITY_VERSION },
  });
  const u = await unlockProject({ workspaceId: c.workspaceId, projectId: id, userId: c.user.id });
  return json({ ok: true, source: u.source });
});
