import { LIABILITY_VERSION } from "@/config/liability";
import { audit } from "@/server/audit";
import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { handler, HttpError, json, readJson } from "@/server/http";
import { GatewayError } from "@/server/payments/gateway";
import { createOrder } from "@/server/payments/service";
import { enforce, LIMITS } from "@/server/ratelimit";
import { zEmail } from "@/server/services/auth";

export const POST = handler(async (req: Request) => {
  const c = await requireMember();
  const body = await readJson(req, z.object({
      productCode: z.string().max(40),
      projectId: z.string().max(60).nullable().optional(),
      /** Jen pro hosta – e-mail pro doklad o platbě. */
      email: zEmail.optional(),
      /** Povinné u nákupu ke konkrétnímu projektu – prohlášení o odpovědnosti zpracovatele. */
      acceptLiability: z.boolean().optional(),
    }));
  await enforce(`payment:${c.user.id}`, LIMITS.payment);
  if (body.projectId) {
    if (body.acceptLiability !== true) {
      throw new HttpError(400, "bad_request", "Potvrďte prosím prohlášení o odpovědnosti zpracovatele.");
    }
    await audit("project.liability_accepted", {
      userId: c.user.id,
      workspaceId: c.workspaceId,
      meta: { projectId: body.projectId, version: LIABILITY_VERSION },
    });
  }
  try {
    const r = await createOrder({
      workspaceId: c.workspaceId,
      userId: c.user.id,
      userEmail: c.user.isGuest ? (body.email ?? "") : c.user.email,
      emailVerified: c.user.emailVerified,
      isGuest: c.user.isGuest,
      productCode: body.productCode,
      projectId: body.projectId ?? null,
    });
    return json(r, { status: 201 });
  } catch (e) {
    if (e instanceof GatewayError) throw new HttpError(502, "payment_gateway", e.message);
    throw e;
  }
});
