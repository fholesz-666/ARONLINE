/**
 * Kontrola původu požadavků (CSRF) a kanonická adresa webu – čisté funkce pro middleware.
 */

export interface OriginContext {
  appUrl?: string;
  allowedOrigins?: string;
  /** origin, jak ho vidí Next (za proxy může být interní) */
  nextOrigin: string;
  /** hostitel z hlavičky X-Forwarded-Host / Host */
  host: string | null;
}

export function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

/**
 * Povolené zdroje: APP_URL, ALLOWED_ORIGINS a hostitel, na kterého požadavek míří (stránka z téže domény).
 * Cizí web nemůže podvrhnout hlavičku Origin prohlížeče, takže ochrana proti CSRF zůstává zachována.
 */
export function isAllowedOrigin(origin: string | null, ctx: OriginContext): boolean {
  if (!origin) return false;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  if (o.origin === originOf(ctx.appUrl) || o.origin === ctx.nextOrigin) return true;
  const extra = (ctx.allowedOrigins ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (extra.includes(o.origin)) return true;
  return ctx.host != null && o.host.toLowerCase() === ctx.host.toLowerCase();
}

/**
 * Cílová kanonická URL pro www a adresu Renderu (jen GET mimo /api), jinak null.
 */
export function canonicalUrl(p: { appUrl?: string; host: string | null; method: string; pathname: string; search: string }): string | null {
  const app = originOf(p.appUrl);
  if (!app || p.method !== "GET" || p.pathname.startsWith("/api/") || !p.host) return null;
  const host = p.host.toLowerCase();
  const appHost = new URL(app).host.toLowerCase();
  if (host === appHost) return null;
  const isWww = host === `www.${appHost}`;
  const isRender = host.endsWith(".onrender.com") && !appHost.endsWith(".onrender.com");
  if (!isWww && !isRender) return null;
  return new URL(p.pathname + p.search, app).toString();
}
