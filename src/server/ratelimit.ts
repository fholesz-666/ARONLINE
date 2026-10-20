/**
 * Rate limiting nad PostgreSQL (fixní okno). Funguje i při více instancích aplikace.
 */
import { lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { rateLimits } from "./db/schema";
import { tooMany } from "./http";

export interface Limit {
  /** Počet požadavků v okně */
  max: number;
  /** Délka okna v sekundách */
  windowSec: number;
}

export const LIMITS = {
  login: { max: 10, windowSec: 15 * 60 },
  register: { max: 5, windowSec: 60 * 60 },
  passwordReset: { max: 5, windowSec: 60 * 60 },
  geo: { max: 120, windowSec: 60 },
  payment: { max: 20, windowSec: 60 * 60 },
  export: { max: 60, windowSec: 60 * 60 },
  calc: { max: 120, windowSec: 60 * 60 },
  notify: { max: 300, windowSec: 60 },
} satisfies Record<string, Limit>;

/** Zvýší čítač a vrátí true, pokud je limit překročen. */
export async function hit(key: string, limit: Limit, now = new Date()): Promise<boolean> {
  const windowMs = limit.windowSec * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const db = getDb();
  const rows = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  // občasný úklid starých oken
  if (Math.random() < 0.01) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 24 * 3600 * 1000)));
  }
  return (rows[0]?.count ?? 0) > limit.max;
}

export async function enforce(key: string, limit: Limit): Promise<void> {
  if (await hit(key, limit)) throw tooMany();
}
