/**
 * Spouští se jednou při startu serveru (jen Node.js runtime): migrace databáze a doplnění ceníku.
 */
export async function runStartupTasks() {
  if (process.env.AUTO_MIGRATE === "false" || !process.env.DATABASE_URL) return;
  const path = await import("node:path");
  const { Client } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { seedProducts } = await import("./server/services/billing");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_INSECURE !== "true" } : undefined,
  });
  await client.connect();
  try {
    // zámek na jednom spojení – brání souběžným migracím při více instancích
    await client.query("select pg_advisory_lock(727301)");
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    await seedProducts(false);
    console.log(JSON.stringify({ level: "info", event: "startup_migrations_done" }));
    // úklid nedokončených účtů hostů – při startu a pak jednou denně
    const { purgeStaleGuests } = await import("./server/services/auth");
    const purge = () =>
      purgeStaleGuests().catch((err) =>
        console.error(JSON.stringify({ level: "error", event: "guest_purge_failed", message: err instanceof Error ? err.message : String(err) })),
      );
    void purge();
    setInterval(purge, 24 * 3600 * 1000).unref();
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "startup_migrations_failed", message: e instanceof Error ? e.message : String(e) }));
    throw e;
  } finally {
    await client.query("select pg_advisory_unlock(727301)").catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}
