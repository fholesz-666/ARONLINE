/**
 * Společné pomocné funkce API protokolů VV.
 */
import { getCurrent } from "./auth/session";
import { clientIp } from "./http";
import { enforce, LIMITS } from "./ratelimit";

/** Token protokolu: hlavička X-VV-Token (preferováno, nedostane se do logů), záložně ?t= */
export function vvToken(req: Request): string | null {
  return req.headers.get("x-vv-token") ?? new URL(req.url).searchParams.get("t");
}

export async function limitVvRead(req: Request) {
  await enforce(`vvread:${clientIp(req)}`, LIMITS.vvRead);
}

/** Přihlášený registrovaný uživatel (host se nepočítá) – vlastník protokolů a držitel kreditů. */
export async function vvViewer(): Promise<{ userId: string; workspaceId: string | null; email: string } | null> {
  const c = await getCurrent();
  if (!c || c.user.isGuest) return null;
  return { userId: c.user.id, workspaceId: c.workspaceId, email: c.user.email };
}
