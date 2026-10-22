import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { cancelPendingOrder, confirmBankPayment } from "@/server/payments/service";

type Ctx = { params: Promise<{ id: string }> };

/** Potvrzení přijaté platby převodem nebo zrušení nezaplacené objednávky. */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireAdmin();
  const { id } = await ctx.params;
  const body = await readJson(
    req,
    z.object({ action: z.enum(["confirm", "cancel"]), paidAt: z.string().date().optional() }),
  );
  if (body.action === "confirm") {
    const paidAt = body.paidAt ? new Date(`${body.paidAt}T12:00:00Z`) : new Date();
    return json(await confirmBankPayment(id, c.user.id, paidAt));
  }
  await cancelPendingOrder(id, { userId: c.user.id, isAdmin: true });
  return json({ ok: true });
});
