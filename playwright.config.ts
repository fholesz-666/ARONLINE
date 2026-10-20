import { defineConfig } from "@playwright/test";

/**
 * E2E testy celého průchodu aplikací. Předpoklad: běžící aplikace (npm run build && npm start)
 * s PAYMENTS_MODE=mock a REQUIRE_VERIFIED_CORE=false, prázdná nebo testovací databáze.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "cs-CZ",
    timezoneId: "Europe/Prague",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
});
