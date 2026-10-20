import { getDb, type Tx } from "./db";
import { auditLogs } from "./db/schema";
import { errorMeta, log } from "./log";

/** Zápis důležité události (bez osobních údajů v `meta`). */
export async function audit(
  action: string,
  data: { userId?: string | null; workspaceId?: string | null; meta?: Record<string, unknown> },
  tx?: Tx,
) {
  try {
    await (tx ?? getDb()).insert(auditLogs).values({
      action,
      userId: data.userId ?? null,
      workspaceId: data.workspaceId ?? null,
      meta: data.meta ?? null,
    });
  } catch (e) {
    log.warn("audit_failed", { action, ...errorMeta(e) });
  }
}
