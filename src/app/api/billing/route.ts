import { requireMember } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { GUEST_PRODUCT_CODE, listOrders, paymentsAvailable } from "@/server/payments/service";
import { activeSubscription, creditBalance, ledgerHistory, listProducts, subscriptionUnlocksUsed } from "@/server/services/billing";

export const GET = handler(async () => {
  const c = await requireMember();
  const sub = await activeSubscription(c.workspaceId);
  const all = await listProducts();
  return json({
    isGuest: c.user.isGuest,
    // Host vidí jen jednorázovou analýzu; balíčky a předplatné vyžadují registraci.
    products: c.user.isGuest ? all.filter((p) => p.code === GUEST_PRODUCT_CODE) : all,
    balance: await creditBalance(c.workspaceId),
    subscription: sub
      ? {
          productCode: sub.product.code,
          productName: sub.product.name,
          status: sub.subscription.status,
          currentPeriodEnd: sub.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: sub.subscription.cancelAtPeriodEnd,
          unlocksUsed: await subscriptionUnlocksUsed(sub),
          unlocksPerPeriod: sub.product.unlocksPerPeriod,
        }
      : null,
    orders: (await listOrders(c.workspaceId)).map((o) => ({
      id: o.id,
      number: o.number,
      productCode: o.productCode,
      productName: (o.productSnapshot as { name: string }).name,
      amountHaler: o.amountHaler,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
    })),
    ledger: await ledgerHistory(c.workspaceId),
    payments: paymentsAvailable(),
  });
});
