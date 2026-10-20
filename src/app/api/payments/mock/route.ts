/**
 * Ovládání simulované brány – POUZE v režimu PAYMENTS_MODE=mock (vývoj a testy).
 */
import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { getConfig } from "@/server/config";
import { getDb } from "@/server/db";
import { forbidden, handler, json, notFound, readJson } from "@/server/http";
import { MockGateway } from "@/server/payments/mock";
import { syncPayment } from "@/server/payments/service";

export const POST = handler(async (req: Request) => {
  if (getConfig().PAYMENTS_MODE !== "mock") throw forbidden("Simulovaná brána je vypnutá.");
  const c = await requireMember();
  const body = await readJson(
    req,
    z.object({ id: z.string().regex(/^\d{1,20}$/), action: z.enum(["PAID", "CANCELED", "RECUR"]) }),
  );
  // platba musí patřit do workspace přihlášeného uživatele
  const payment = await getDb().query.payments.findFirst({
    where: (p, { and, eq }) => and(eq(p.provider, "MOCK"), eq(p.providerPaymentId, body.id)),
  });
  const order = payment?.orderId ? await getDb().query.orders.findFirst({ where: (o, { eq }) => eq(o.id, payment.orderId!) }) : null;
  if (!order || order.workspaceId !== c.workspaceId) throw notFound("Platba nebyla nalezena.");
  if (body.action === "RECUR") {
    const childId = MockGateway.createRecurrence(body.id, "PAID");
    await syncPayment(childId, "mock", body.id);
    return json({ ok: true, childId });
  }
  MockGateway.setState(body.id, body.action);
  await syncPayment(body.id, "mock");
  return json({ ok: true });
});
