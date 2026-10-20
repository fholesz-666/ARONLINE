import type { Ed2CalculationResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2";
import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { getUnlock } from "@/server/services/billing";
import { resultView } from "@/server/services/preview";
import { latestRun } from "@/server/services/projects";
import { requireProjectAccess } from "@/server/services/workspace";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await requireProjectAccess(c.user.id, c.workspaceId, id);
  const run = await latestRun(id);
  if (!run) return json({ run: null });
  const unlocked = (await getUnlock(id)) != null;
  return json({
    run: {
      id: run.id,
      createdAt: run.createdAt,
      coreVersion: run.coreVersion,
      inputHash: run.inputHash,
      view: resultView(run.result as Ed2CalculationResult, unlocked),
    },
    unlocked,
  });
});
