/**
 * Spouští se jednou při startu serveru: aplikuje databázové migrace a doplní ceník.
 * Vypnutí: AUTO_MIGRATE=false (pak spusťte migrace ručně: npm run db:migrate).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupTasks } = await import("./instrumentation-node");
    await runStartupTasks();
  }
}
