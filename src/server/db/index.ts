import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __aronlinePool?: Pool; __aronlineDb?: DB };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Chybí proměnná prostředí DATABASE_URL");
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: sslOptions(),
  });
}

/** TLS pro spojení s DB. DATABASE_SSL_CA = vlastní certifikační autorita v PEM (např. Supabase). */
export function sslOptions() {
  if (process.env.DATABASE_SSL !== "true") return undefined;
  return {
    rejectUnauthorized: process.env.DATABASE_SSL_INSECURE !== "true",
    ca: process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n") || undefined,
  };
}

/** Sdílené připojení k DB (v dev režimu přežije hot-reload). */
export function getDb(): DB {
  if (!globalForDb.__aronlineDb) {
    globalForDb.__aronlinePool = createPool();
    globalForDb.__aronlineDb = drizzle(globalForDb.__aronlinePool, { schema });
  }
  return globalForDb.__aronlineDb;
}

export async function closeDb(): Promise<void> {
  if (globalForDb.__aronlinePool) {
    await globalForDb.__aronlinePool.end();
    globalForDb.__aronlinePool = undefined;
    globalForDb.__aronlineDb = undefined;
  }
}

export { schema };
