/**
 * Pomocné funkce pro Route Handlers: jednotné chyby, validace těla, limit velikosti.
 */
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { errorMeta, log } from "./log";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, "bad_request", message, details);
export const unauthorized = (message = "Přihlaste se prosím.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "K této akci nemáte oprávnění.") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Záznam nebyl nalezen.") => new HttpError(404, "not_found", message);
export const conflict = (message: string, details?: unknown) => new HttpError(409, "conflict", message, details);
export const paymentRequired = (message: string) => new HttpError(402, "payment_required", message);
export const tooMany = (message = "Příliš mnoho požadavků. Zkuste to prosím později.") =>
  new HttpError(429, "rate_limited", message);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

const MAX_BODY = 1_000_000; // 1 MB

export async function readJson<T>(req: Request, schema: ZodType<T>, maxBytes = MAX_BODY): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) throw new HttpError(413, "too_large", "Požadavek je příliš velký.");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "Požadavek je příliš velký.");
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw badRequest("Neplatný formát požadavku (JSON).");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest(
      "Neplatné údaje.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return parsed.data;
}

/** Obalí handler: převede HttpError na JSON odpověď, ostatní chyby zaloguje bez citlivých dat. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.code, message: e.message, details: e.details }, { status: e.status });
      }
      const req = args[0] as Request | undefined;
      log.error("unhandled_error", { path: req?.url ? new URL(req.url).pathname : undefined, ...errorMeta(e) });
      return NextResponse.json(
        { error: "server_error", message: "Došlo k neočekávané chybě. Zkuste to prosím znovu." },
        { status: 500 },
      );
    }
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
