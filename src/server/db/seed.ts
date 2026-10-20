/**
 * Naplnění výchozích dat (ceník). Bezpečné spustit opakovaně.
 * `npm run db:seed` – vloží chybějící produkty
 * `npm run db:seed -- --force-prices` – přepíše ceny podle src/config/pricing.ts
 */
import { closeDb } from "./index";
import { seedProducts } from "../services/billing";

async function main() {
  const force = process.argv.includes("--force-prices");
  await seedProducts(force);
  console.log(force ? "Ceník přepsán podle src/config/pricing.ts." : "Chybějící produkty doplněny.");
  await closeDb();
}

main().catch(async (e) => {
  console.error("Seed selhal:", e instanceof Error ? e.message : e);
  await closeDb();
  process.exit(1);
});
