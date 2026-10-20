import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

/** Kontrola stavu pro hosting (health check) – ověří spojení s databází. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
