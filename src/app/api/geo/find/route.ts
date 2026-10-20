import { requireUser } from "@/server/auth/session";
import { findLocation, GeoError } from "@/server/geo/cuzk";
import { badRequest, handler, HttpError, json, notFound } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";

export const GET = handler(async (req: Request) => {
  const c = await requireUser();
  await enforce(`geo:${c.user.id}`, LIMITS.geo);
  const sp = new URL(req.url).searchParams;
  const text = sp.get("text")?.slice(0, 300) ?? "";
  const magicKey = sp.get("magicKey") ?? "";
  if (!/^[0-9_]{1,40}$/.test(magicKey)) throw badRequest("Neplatný výběr adresy.");
  try {
    const loc = await findLocation(text, magicKey);
    if (!loc) throw notFound("Adresa nebyla nalezena.");
    return json(loc);
  } catch (e) {
    if (e instanceof GeoError) throw new HttpError(502, "geo_unavailable", e.message);
    throw e;
  }
});
