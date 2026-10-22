/**
 * Middleware: bezpečnostní hlavičky a ochrana proti CSRF (kontrola Origin u mutujících požadavků).
 */
import { NextResponse, type NextRequest } from "next/server";
import { canonicalUrl, isAllowedOrigin } from "./lib/origin";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Endpointy volané třetí stranou (platební brána) – bez kontroly Origin. */
const ORIGIN_EXEMPT = ["/api/payments/notify"];

/** Host, na který prohlížeč skutečně poslal požadavek (za proxy Renderu). */
function requestHost(req: NextRequest): string | null {
  return (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))?.split(",")[0].trim().toLowerCase() ?? null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const target = canonicalUrl({
    appUrl: process.env.APP_URL,
    host: requestHost(req),
    method: req.method,
    pathname,
    search: req.nextUrl.search,
  });
  if (target) return NextResponse.redirect(target, 308);

  if (pathname.startsWith("/api/") && MUTATING.has(req.method) && !ORIGIN_EXEMPT.includes(pathname)) {
    // Prohlížeče posílají Origin u všech POST požadavků; jeho absence nebo cizí původ = odmítnout.
    const ok = isAllowedOrigin(req.headers.get("origin"), {
      appUrl: process.env.APP_URL,
      allowedOrigins: process.env.ALLOWED_ORIGINS,
      nextOrigin: req.nextUrl.origin,
      host: requestHost(req),
    });
    if (!ok) {
      return NextResponse.json({ error: "forbidden", message: "Neplatný původ požadavku." }, { status: 403 });
    }
  }

  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://ags.cuzk.gov.cz https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://gate.gopay.cz https://gw.sandbox.gopay.com",
    "object-src 'none'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  if (!isDev) res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
