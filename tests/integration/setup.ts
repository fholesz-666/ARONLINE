/**
 * Společná příprava integračních testů – čistá testovací databáze.
 * Vyžaduje TEST_DATABASE_URL (výchozí: postgresql://postgres@127.0.0.1:5432/aronline_test).
 */
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export async function setupTestDb() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/aronline_test";
  process.env.APP_ENV = "test";
  process.env.PAYMENTS_MODE = "mock";
  process.env.APP_URL = "http://localhost:3000";
  process.env.REQUIRE_VERIFIED_CORE = process.env.REQUIRE_VERIFIED_CORE ?? "false";
  const { resetConfigForTests } = await import("@/server/config");
  resetConfigForTests();
  const { getDb } = await import("@/server/db");
  const db = getDb();
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`create schema public`);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { seedProducts } = await import("@/server/services/billing");
  await seedProducts(true);
  return db;
}

export async function teardownTestDb() {
  const { closeDb } = await import("@/server/db");
  await closeDb();
}
