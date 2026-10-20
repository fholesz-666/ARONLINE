import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, HttpError, json, readJson } from "@/server/http";
import { GatewayError } from "@/server/payments/gateway";
import { createOrder } from "@/server/payments/service";
import { enforce, LIMITS } from "@/server/ratelimit";

export const POST = handler(async (req: Request) => {
  const c = await requireMember();
  const body = await readJson(req, z.object({ productCode: z.string().max(40), projectId: z.string().max(60).nullable().optional() }));
  await enforce(`payment:${c.user.id}`, LIMITS.payment);
  try {
    const r = await createOrder({
      workspaceId: c.workspaceId,
      userId: c.user.id,
      userEmail: c.user.email,
      emailVerified: c.user.emailVerified,
      productCode: body.productCode,
      projectId: body.projectId ?? null,
    });
    return json(r, { status: 201 });
  } catch (e) {
    if (e instanceof GatewayError) throw new HttpError(502, "payment_gateway", e.message);
    throw e;
  }
});
