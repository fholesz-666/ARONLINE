import { clientIp, handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { createProtocol, zVvCreate } from "@/server/services/vv";

/** Uložení nového protokolu o určení vnějších vlivů (zdarma, bez registrace). */
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req);
  await enforce(`vvcreate:${ip}`, LIMITS.vvCreate);
  const body = await readJson(req, zVvCreate, 500_000);
  const r = await createProtocol(body, ip);
  return json(r, { status: 201 });
});
