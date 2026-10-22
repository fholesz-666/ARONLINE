import { requireAdmin } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { listAllOrders } from "@/server/services/admin";

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const u = new URL(req.url);
  const status = u.searchParams.get("status") ?? undefined;
  const method = u.searchParams.get("method") ?? undefined;
  return json({
    orders: await listAllOrders({
      status: status && ["PENDING", "PAID", "CANCELED", "FAILED", "REFUNDED"].includes(status) ? status : undefined,
      method: method && ["CARD", "BANK"].includes(method) ? method : undefined,
      q: u.searchParams.get("q")?.slice(0, 60) ?? undefined,
    }),
  });
});
