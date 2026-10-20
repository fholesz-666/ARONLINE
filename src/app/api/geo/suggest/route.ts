import { requireUser } from "@/server/auth/session";
import { suggest } from "@/server/geo/cuzk";
import { GeoError } from "@/server/geo/cuzk";
import { badRequest, handler, HttpError, json } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";

export const GET = handler(async (req: Request) => {
  const c = await requireUser();
  await enforce(`geo:${c.user.id}`, LIMITS.geo);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return json({ suggestions: [] });
  if (q.length > 200) throw badRequest("Dotaz je příliš dlouhý.");
  try {
    return json({ suggestions: await suggest(q) });
  } catch (e) {
    if (e instanceof GeoError) throw new HttpError(502, "geo_unavailable", e.message);
    throw e;
  }
});
