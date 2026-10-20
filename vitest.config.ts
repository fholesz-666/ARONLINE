import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", "e2e/**"],
    // integrační testy s DB běží sekvenčně (sdílená testovací databáze)
    fileParallelism: false,
    testTimeout: 30000,
  },
});
