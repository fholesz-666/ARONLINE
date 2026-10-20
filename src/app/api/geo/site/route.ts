import { requireUser } from "@/server/auth/session";
import { lookupSite } from "@/server/geo/site";
import { badRequest, handler, json } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";

/** Zjištění budovy, parcely, výšky a okolí v bodě (data ČÚZK). */
export const GET = handler(async (req: Request) => {
  const c = await requireUser();
  await enforce(`geo:${c.user.id}`, LIMITS.geo);
  const sp = new URL(req.url).searchParams;
  const lon = Number(sp.get("lon"));
  const lat = Number(sp.get("lat"));
  // přibližné hranice ČR s rezervou
  if (!(lon > 12 && lon < 19 && lat > 48.4 && lat < 51.2)) throw badRequest("Bod leží mimo území České republiky.");
  const pick = sp.get("building")?.slice(0, 40) ?? undefined;
  const site = await lookupSite(lon, lat, { pickBuildingId: pick });
  return json(site);
});
