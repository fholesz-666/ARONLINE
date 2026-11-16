/**
 * Společné pomocné funkce API protokolů VV.
 */
import { clientIp } from "./http";
import { enforce, LIMITS } from "./ratelimit";

/** Token protokolu: hlavička X-VV-Token (preferováno, nedostane se do logů), záložně ?t= */
export function vvToken(req: Request): string | null {
  return req.headers.get("x-vv-token") ?? new URL(req.url).searchParams.get("t");
}

export async function limitVvRead(req: Request) {
  await enforce(`vvread:${clientIp(req)}`, LIMITS.vvRead);
}
