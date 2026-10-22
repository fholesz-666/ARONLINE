import { requireAdmin } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { listUsers } from "@/server/services/admin";

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const u = new URL(req.url);
  return json(
    await listUsers({
      q: u.searchParams.get("q")?.slice(0, 100) ?? undefined,
      includeGuests: u.searchParams.get("guests") === "1",
      offset: Math.max(0, Number(u.searchParams.get("offset") ?? 0) || 0),
      limit: 50,
    }),
  );
});
