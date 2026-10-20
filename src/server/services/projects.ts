/**
 * Projekty: založení, autosave s kontrolou verze, historie, kopie, výpočet.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { buildingType } from "@/catalog";
import { calculate, CORE_VERSION } from "@/core/risk";
import { DEFAULT_METHODOLOGY, METHODOLOGIES } from "@/core/risk/registry";
import { newProjectData, zProcessorData, zProjectData, type ProcessorData, type ProjectData } from "@/domain/project";
import { audit } from "../audit";
import { getDb } from "../db";
import { calculationRuns, processorProfiles, projectRevisions, projects, projectUnlocks } from "../db/schema";
import { badRequest, conflict, notFound } from "../http";
import { requireProjectAccess } from "./workspace";

const MAX_DATA_BYTES = 400_000;
const REVISION_INTERVAL_MS = 30 * 60 * 1000;

export async function listProjects(workspaceId: string) {
  const db = getDb();
  return db
    .select({
      id: projects.id,
      name: projects.name,
      jobNumber: projects.jobNumber,
      status: projects.status,
      methodologyId: projects.methodologyId,
      updatedAt: projects.updatedAt,
      createdAt: projects.createdAt,
      unlockedAt: projectUnlocks.createdAt,
    })
    .from(projects)
    .leftJoin(projectUnlocks, eq(projectUnlocks.projectId, projects.id))
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt))
    .limit(500);
}

export async function defaultProfileId(workspaceId: string): Promise<string | null> {
  const p = await getDb().query.processorProfiles.findFirst({
    where: eq(processorProfiles.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.isDefault), desc(t.updatedAt)],
  });
  return p?.id ?? null;
}

export async function createProject(p: { workspaceId: string; userId: string; name: string; buildingType: string; copyIdentificationFrom?: string | null }) {
  const db = getDb();
  const profileId = await defaultProfileId(p.workspaceId);
  const data = newProjectData(buildingType(p.buildingType).key, profileId);
  data.identification.projectName = p.name;
  // předvyplnění posledních použitých údajů investora/stupně z posledního projektu
  const last = await db.query.projects.findFirst({
    where: and(eq(projects.workspaceId, p.workspaceId), isNull(projects.deletedAt)),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });
  if (last) {
    const lastData = zProjectData.safeParse(last.data);
    if (lastData.success) {
      data.identification.docStage = lastData.data.identification.docStage;
      data.identification.processorOverride = lastData.data.identification.processorOverride;
    }
  }
  const [row] = await db
    .insert(projects)
    .values({
      workspaceId: p.workspaceId,
      createdById: p.userId,
      name: p.name,
      methodologyId: DEFAULT_METHODOLOGY,
      data,
    })
    .returning();
  await audit("project.create", { userId: p.userId, workspaceId: p.workspaceId, meta: { projectId: row.id } });
  return row;
}

/** Pole identifikující objekt – po odemčení je nelze měnit. */
function objectIdentity(d: ProjectData) {
  return JSON.stringify({
    loc: d.site.location ? [Number(d.site.location.lon.toFixed(5)), Number(d.site.location.lat.toFixed(5))] : null,
    addr: d.site.address?.text ?? null,
    parcel: d.site.parcel?.label ?? null,
    bAddr: d.identification.building.address,
    bParcel: d.identification.building.parcel,
  });
}

export async function updateProject(p: {
  userId: string;
  workspaceId: string;
  projectId: string;
  version: number;
  data: unknown;
  name?: string;
}) {
  const raw = JSON.stringify(p.data ?? {});
  if (raw.length > MAX_DATA_BYTES) throw badRequest("Data projektu jsou příliš velká.");
  const parsed = zProjectData.safeParse(p.data);
  if (!parsed.success) {
    throw badRequest(
      "Neplatná data projektu.",
      parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const data = parsed.data;
  const project = await requireProjectAccess(p.userId, p.workspaceId, p.projectId);
  if (project.objectLockedAt) {
    const prev = zProjectData.safeParse(project.data);
    if (prev.success && objectIdentity(prev.data) !== objectIdentity(data)) {
      throw conflict(
        "Analýza je odemčena pro konkrétní objekt – adresu, polohu a parcelu nelze změnit. Pro jiný objekt vytvořte kopii projektu.",
      );
    }
  }
  const db = getDb();
  const name = (p.name ?? data.identification.projectName ?? project.name).trim().slice(0, 200) || project.name;
  const [updated] = await db
    .update(projects)
    .set({
      data,
      name,
      jobNumber: data.identification.jobNumber || null,
      version: sql`${projects.version} + 1`,
    })
    .where(and(eq(projects.id, p.projectId), eq(projects.workspaceId, p.workspaceId), eq(projects.version, p.version)))
    .returning({ version: projects.version, updatedAt: projects.updatedAt });
  if (!updated) {
    throw conflict("Projekt mezitím upravil někdo jiný (nebo jiná záložka). Načtěte prosím aktuální verzi.", {
      currentVersion: project.version,
    });
  }
  // revize nejvýše jednou za 30 minut při autosave
  const lastRev = await db.query.projectRevisions.findFirst({
    where: eq(projectRevisions.projectId, p.projectId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  if (!lastRev || Date.now() - lastRev.createdAt.getTime() > REVISION_INTERVAL_MS) {
    await saveRevision(p.projectId, p.userId, updated.version, data, "Automatické uložení");
  }
  return updated;
}

export async function saveRevision(projectId: string, userId: string, version: number, data: unknown, note: string) {
  const db = getDb();
  await db.insert(projectRevisions).values({ projectId, userId, version, data, note: note.slice(0, 200) });
  // ponechat posledních 100 revizí
  const old = await db
    .select({ id: projectRevisions.id })
    .from(projectRevisions)
    .where(eq(projectRevisions.projectId, projectId))
    .orderBy(desc(projectRevisions.createdAt))
    .offset(100);
  for (const o of old) await db.delete(projectRevisions).where(eq(projectRevisions.id, o.id));
}

export async function listRevisions(userId: string, workspaceId: string, projectId: string) {
  await requireProjectAccess(userId, workspaceId, projectId);
  return getDb().query.projectRevisions.findMany({
    where: eq(projectRevisions.projectId, projectId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    columns: { id: true, version: true, note: true, createdAt: true, userId: true },
    limit: 100,
  });
}

export async function restoreRevision(userId: string, workspaceId: string, projectId: string, revisionId: string) {
  const project = await requireProjectAccess(userId, workspaceId, projectId);
  const rev = await getDb().query.projectRevisions.findFirst({
    where: and(eq(projectRevisions.id, revisionId), eq(projectRevisions.projectId, projectId)),
  });
  if (!rev) throw notFound("Revize nebyla nalezena.");
  await saveRevision(projectId, userId, project.version, project.data, "Stav před obnovením revize");
  return updateProject({ userId, workspaceId, projectId, version: project.version, data: rev.data });
}

export async function duplicateProject(userId: string, workspaceId: string, projectId: string) {
  const src = await requireProjectAccess(userId, workspaceId, projectId);
  const parsed = zProjectData.parse(src.data);
  parsed.identification.projectName = `${src.name} (kopie)`;
  const [row] = await getDb()
    .insert(projects)
    .values({
      workspaceId,
      createdById: userId,
      name: `${src.name} (kopie)`.slice(0, 200),
      jobNumber: src.jobNumber,
      methodologyId: src.methodologyId,
      data: parsed,
      copiedFromId: src.id,
    })
    .returning();
  await audit("project.duplicate", { userId, workspaceId, meta: { from: src.id, to: row.id } });
  return row;
}

export async function deleteProject(userId: string, workspaceId: string, projectId: string) {
  await requireProjectAccess(userId, workspaceId, projectId);
  await getDb()
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
  await audit("project.delete", { userId, workspaceId, meta: { projectId } });
}

/* --- Profil zpracovatele ------------------------------------------- */

export async function resolveProcessor(workspaceId: string, data: ProjectData): Promise<{ profileId: string | null; processor: ProcessorData }> {
  const db = getDb();
  const profile = data.identification.processorProfileId
    ? await db.query.processorProfiles.findFirst({
        where: and(eq(processorProfiles.id, data.identification.processorProfileId), eq(processorProfiles.workspaceId, workspaceId)),
      })
    : await db.query.processorProfiles.findFirst({
        where: eq(processorProfiles.workspaceId, workspaceId),
        orderBy: (t, { desc }) => [desc(t.isDefault)],
      });
  const base = zProcessorData.parse(profile?.data ?? {});
  const override = data.identification.processorOverride ?? {};
  const merged = zProcessorData.parse({
    ...base,
    ...Object.fromEntries(Object.entries(override).filter(([, v]) => v !== "" && v != null)),
    appearance: { ...base.appearance, ...(override.appearance ?? {}) },
  });
  return { profileId: profile?.id ?? null, processor: merged };
}

/* --- Výpočet ------------------------------------------------------- */

export async function runCalculation(userId: string, workspaceId: string, projectId: string) {
  const project = await requireProjectAccess(userId, workspaceId, projectId);
  const data = zProjectData.parse(project.data);
  const out = calculate(project.methodologyId, data.calc);
  if (!out.ok || !("result" in out)) {
    return { ok: false as const, issues: out.ok ? [] : out.issues };
  }
  const { profileId, processor } = await resolveProcessor(workspaceId, data);
  const context = {
    identification: data.identification,
    processor,
    processorProfileId: profileId,
    buildingType: { key: data.buildingType, label: buildingType(data.buildingType).label },
    site: {
      location: data.site.location,
      address: data.site.address,
      parcel: data.site.parcel,
      building: data.site.building
        ? {
            area: data.site.building.area,
            length: data.site.building.length,
            width: data.site.building.width,
            heightEstimate: data.site.building.heightEstimate,
            terrainElevation: data.site.building.terrainElevation,
            source: data.site.building.source,
          }
        : null,
      neighbours: data.site.neighbours.map((n) => ({
        distance: n.distance,
        height: n.heightManual ?? n.heightEstimate ?? null,
        include: n.include,
      })),
      dataNotes: data.site.dataNotes,
    },
    provenance: data.provenance,
    methodology: METHODOLOGIES[project.methodologyId],
  };
  const db = getDb();
  const [run] = await db
    .insert(calculationRuns)
    .values({
      projectId,
      userId,
      methodologyId: out.methodologyId,
      coreVersion: CORE_VERSION,
      normativeDataHash: out.result.normativeDataHash,
      inputHash: out.inputHash ?? "",
      input: out.input,
      result: out.result,
      context,
      verifiedCore: out.result.verification.fullyVerified,
    })
    .returning({ id: calculationRuns.id, createdAt: calculationRuns.createdAt });
  await db.update(projects).set({ status: "CALCULATED" }).where(eq(projects.id, projectId));
  await saveRevision(projectId, userId, project.version, project.data, "Výpočet");
  await audit("project.calculate", { userId, workspaceId, meta: { projectId, runId: run.id } });
  return { ok: true as const, runId: run.id, createdAt: run.createdAt, result: out.result };
}

export async function latestRun(projectId: string) {
  return (
    (await getDb().query.calculationRuns.findFirst({
      where: eq(calculationRuns.projectId, projectId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })) ?? null
  );
}

export async function getRun(projectId: string, runId: string) {
  return (
    (await getDb().query.calculationRuns.findFirst({
      where: and(eq(calculationRuns.id, runId), eq(calculationRuns.projectId, projectId)),
    })) ?? null
  );
}

/** Údržba: smazání starých záznamů cache a limitů (volat z cronu). */
export async function cleanupOld() {
  const db = getDb();
  await db.execute(sql`delete from geo_cache where expires_at < now()`);
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  await db.execute(sql`delete from sessions where expires_at < now()`);
}
