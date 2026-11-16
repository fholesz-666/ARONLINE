import { z } from "zod";
import { VV_PRODUCT_CODE } from "@/config/pricing";
import { getCurrent, startSession } from "@/server/auth/session";
import { clientIp, conflict, forbidden, handler, HttpError, json, readJson } from "@/server/http";
import { GatewayError } from "@/server/payments/gateway";
import { createOrder, paymentsAvailable } from "@/server/payments/service";
import { enforce, LIMITS } from "@/server/ratelimit";
import { createGuestUser, toPublicUser, zEmail, type PublicUser } from "@/server/services/auth";
import { getProtocol } from "@/server/services/vv";
import { getMembership } from "@/server/services/workspace";
import { vvToken } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Objednávka placené verze protokolu (99 Kč) – platba kartou přes GoPay.
 * Bez přihlášení se na pozadí založí účet hosta (stejně jako u jednorázové analýzy),
 * aby k objednávce a dokladu existoval zákazník.
 */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(
    req,
    z.object({
      email: zEmail,
      acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je nutný souhlas s obchodními podmínkami" }) }),
    }),
  );
  const protocol = await getProtocol(id, vvToken(req));
  if (protocol.premiumAt) throw conflict("Protokol už je v placené verzi.");
  await enforce(`payment:vv:${clientIp(req)}`, LIMITS.payment);
  // účet hosta zakládáme, až když je jisté, že platbu lze provést
  const avail = paymentsAvailable(VV_PRODUCT_CODE);
  if (!avail.available) throw forbidden(avail.reason);

  const current = await getCurrent();
  let buyer: { user: PublicUser; workspaceId: string };
  if (current?.workspaceId && (await getMembership(current.user.id, current.workspaceId))) {
    buyer = { user: current.user, workspaceId: current.workspaceId };
  } else {
    const { user, workspace } = await createGuestUser();
    await startSession(user.id, workspace.id);
    buyer = { user: toPublicUser(user), workspaceId: workspace.id };
  }
  const { user: c, workspaceId } = buyer;

  try {
    const r = await createOrder({
      workspaceId,
      userId: c.id,
      userEmail: c.isGuest ? body.email : c.email,
      emailVerified: c.emailVerified,
      isGuest: c.isGuest,
      productCode: VV_PRODUCT_CODE,
      vvProtocolId: protocol.id,
      clientIp: clientIp(req),
    });
    return json({ ...r, redirect: r.gwUrl }, { status: 201 });
  } catch (e) {
    if (e instanceof GatewayError) throw new HttpError(502, "payment_gateway", e.message);
    throw e;
  }
});
