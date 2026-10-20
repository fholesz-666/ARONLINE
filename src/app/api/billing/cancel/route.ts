import { requireMember } from "@/server/auth/session";
import { handler, HttpError, json } from "@/server/http";
import { GatewayError } from "@/server/payments/gateway";
import { cancelSubscription } from "@/server/payments/service";

export const POST = handler(async () => {
  const c = await requireMember("OWNER");
  try {
    await cancelSubscription(c.workspaceId, c.user.id);
  } catch (e) {
    if (e instanceof GatewayError) throw new HttpError(502, "payment_gateway", e.message);
    throw e;
  }
  return json({ ok: true });
});
