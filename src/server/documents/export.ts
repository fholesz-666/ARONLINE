/**
 * Export dokumentace – jen pro odemčené projekty, vždy z konkrétního uloženého výpočtu.
 */
import { eq } from "drizzle-orm";
import type { Ed2CalculationResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2";
import type { Ed2Input } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import { audit } from "../audit";
import { getDb } from "../db";
import { exportLogs, processorProfiles } from "../db/schema";
import { notFound, paymentRequired } from "../http";
import { getUnlock } from "../services/billing";
import { getRun, latestRun } from "../services/projects";
import { requireProjectAccess } from "../services/workspace";
import { renderDocx } from "./docx";
import { buildReport, type RunContext } from "./model";
import { renderPdf } from "./pdf";

export async function exportDocument(p: {
  userId: string;
  workspaceId: string;
  projectId: string;
  format: "PDF" | "DOCX";
  runId?: string | null;
}): Promise<{ filename: string; contentType: string; body: Buffer }> {
  await requireProjectAccess(p.userId, p.workspaceId, p.projectId);
  // Serverové ověření nároku – bez odemčení se dokument nevydá
  const unlock = await getUnlock(p.projectId);
  if (!unlock) throw paymentRequired("Dokumentace je dostupná po zaplacení analýzy nebo s aktivním předplatným.");
  const run = p.runId ? await getRun(p.projectId, p.runId) : await latestRun(p.projectId);
  if (!run) throw notFound("Projekt zatím nemá dokončený výpočet.");

  const context = run.context as RunContext & { processorProfileId?: string | null };
  const model = buildReport({
    id: run.id,
    createdAt: run.createdAt,
    coreVersion: run.coreVersion,
    inputHash: run.inputHash,
    input: run.input as Ed2Input,
    result: run.result as Ed2CalculationResult,
    context,
  });
  let logo: { data: Buffer; mime: string } | null = null;
  if (context.processorProfileId) {
    const prof = await getDb().query.processorProfiles.findFirst({ where: eq(processorProfiles.id, context.processorProfileId) });
    if (prof?.logo && prof.logoMime && prof.workspaceId === p.workspaceId) logo = { data: prof.logo, mime: prof.logoMime };
  }
  const body = p.format === "PDF" ? await renderPdf(model, logo) : await renderDocx(model, logo);
  await getDb().insert(exportLogs).values({ projectId: p.projectId, calculationRunId: run.id, userId: p.userId, format: p.format });
  await audit("project.export", { userId: p.userId, workspaceId: p.workspaceId, meta: { projectId: p.projectId, runId: run.id, format: p.format } });
  return {
    filename: `${model.fileBaseName}.${p.format === "PDF" ? "pdf" : "docx"}`,
    contentType: p.format === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    body,
  };
}
