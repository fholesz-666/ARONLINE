/**
 * HTTP notifikace GoPay (GET ?id=…&parent_id=…).
 * Notifikace NENÍ podepsaná – slouží jen jako podnět k ověření stavu dotazem na GoPay API.
 * Odpověď 200 = přijato; 5xx = GoPay notifikaci zopakuje (max. 20×).
 */
import { clientIp } from "@/server/http";
import { errorMeta, log } from "@/server/log";
import { syncPayment } from "@/server/payments/service";
import { hit, LIMITS } from "@/server/ratelimit";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id") ?? "";
  const parentId = sp.get("parent_id") ?? undefined;
  if (!/^\d{1,20}$/.test(id) || (parentId != null && !/^\d{1,20}$/.test(parentId))) {
    return new Response("invalid", { status: 400 });
  }
  if (await hit(`notify:${clientIp(req)}`, LIMITS.notify)) return new Response("rate limited", { status: 429 });
  try {
    const r = await syncPayment(id, "notify", parentId);
    if (!r || r.kind === "unknown") log.warn("notify_unknown_payment");
    return new Response("OK", { status: 200 });
  } catch (e) {
    log.error("notify_failed", errorMeta(e));
    return new Response("retry", { status: 503 });
  }
}
