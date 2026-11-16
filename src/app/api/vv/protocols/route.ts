import { clientIp, handler, json, readJson } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { createProtocol, zVvCreate } from "@/server/services/vv";
import { vvViewer } from "@/server/vv-http";

/** Uložení nového protokolu o určení vnějších vlivů (zdarma, bez registrace). */
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req);
  await enforce(`vvcreate:${ip}`, LIMITS.vvCreate);
  const body = await readJson(req, zVvCreate, 500_000);
  const viewer = await vvViewer();
  const r = await createProtocol(body, ip, viewer?.userId ?? null);
  return json(r, { status: 201 });
});
