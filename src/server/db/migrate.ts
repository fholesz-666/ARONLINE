/**
 * Aplikuje SQL migrace ze složky ./drizzle. Spouští se při nasazení: `npm run db:migrate`.
 */
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "./index";

async function main() {
  const db = getDb();
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("Migrace databáze dokončeny.");
  await closeDb();
}

main().catch(async (e) => {
  console.error("Migrace selhala:", e instanceof Error ? e.message : e);
  await closeDb();
  process.exit(1);
});
