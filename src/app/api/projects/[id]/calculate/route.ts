import type { Ed2CalculationResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2";
import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { getUnlock } from "@/server/services/billing";
import { resultView } from "@/server/services/preview";
import { runCalculation } from "@/server/services/projects";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await enforce(`calc:${c.user.id}`, LIMITS.calc);
  const r = await runCalculation(c.user.id, c.workspaceId, id);
  if (!r.ok) return json({ ok: false, issues: r.issues }, { status: 422 });
  const unlocked = (await getUnlock(id)) != null;
  return json({ ok: true, runId: r.runId, createdAt: r.createdAt, view: resultView(r.result as Ed2CalculationResult, unlocked) });
});
