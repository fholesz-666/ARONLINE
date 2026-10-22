import { requireAdmin } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { adminOverview } from "@/server/services/admin";

export const GET = handler(async () => {
  await requireAdmin();
  return json(await adminOverview());
});
