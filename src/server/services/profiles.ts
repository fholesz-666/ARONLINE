import { and, count, eq, ne } from "drizzle-orm";
import { zProcessorData } from "@/domain/project";
import { getDb } from "../db";
import { processorProfiles } from "../db/schema";
import { badRequest, notFound } from "../http";

export async function listProfiles(workspaceId: string) {
  const rows = await getDb().query.processorProfiles.findMany({
    where: eq(processorProfiles.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.isDefault), desc(t.updatedAt)],
    columns: { id: true, label: true, isDefault: true, data: true, logoMime: true, updatedAt: true },
  });
  return rows.map((r) => ({ ...r, hasLogo: r.logoMime != null, data: zProcessorData.parse(r.data) }));
}

export async function getProfile(workspaceId: string, id: string) {
  const p = await getDb().query.processorProfiles.findFirst({
    where: and(eq(processorProfiles.id, id), eq(processorProfiles.workspaceId, workspaceId)),
  });
  if (!p) throw notFound("Profil nebyl nalezen.");
  return p;
}

export async function saveProfile(workspaceId: string, id: string | null, input: { label: string; isDefault: boolean; data?: unknown }) {
  const parsed = zProcessorData.safeParse(input.data);
  if (!parsed.success) throw badRequest("Neplatné údaje profilu.", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  const db = getDb();
  const label = input.label.trim().slice(0, 80) || "Profil";
  return db.transaction(async (tx) => {
    let row;
    if (id) {
      [row] = await tx
        .update(processorProfiles)
        .set({ label, isDefault: input.isDefault, data: parsed.data })
        .where(and(eq(processorProfiles.id, id), eq(processorProfiles.workspaceId, workspaceId)))
        .returning();
      if (!row) throw notFound("Profil nebyl nalezen.");
    } else {
      const [{ n }] = await tx.select({ n: count() }).from(processorProfiles).where(eq(processorProfiles.workspaceId, workspaceId));
      if (n >= 20) throw badRequest("Maximální počet profilů je 20.");
      [row] = await tx.insert(processorProfiles).values({ workspaceId, label, isDefault: input.isDefault, data: parsed.data }).returning();
    }
    if (input.isDefault) {
      await tx
        .update(processorProfiles)
        .set({ isDefault: false })
        .where(and(eq(processorProfiles.workspaceId, workspaceId), ne(processorProfiles.id, row.id)));
    }
    return row;
  });
}

export async function deleteProfile(workspaceId: string, id: string) {
  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(processorProfiles).where(eq(processorProfiles.workspaceId, workspaceId));
  if (n <= 1) throw badRequest("Poslední profil nelze smazat.");
  await db.delete(processorProfiles).where(and(eq(processorProfiles.id, id), eq(processorProfiles.workspaceId, workspaceId)));
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPG = [0xff, 0xd8, 0xff];

/** Ověří typ obrázku podle obsahu (ne podle přípony). */
export function sniffImage(buf: Buffer): "image/png" | "image/jpeg" | null {
  if (PNG.every((b, i) => buf[i] === b)) return "image/png";
  if (JPG.every((b, i) => buf[i] === b)) return "image/jpeg";
  return null;
}

export async function setLogo(workspaceId: string, id: string, buf: Buffer | null) {
  await getProfile(workspaceId, id);
  if (buf) {
    if (buf.length > 300_000) throw badRequest("Logo může mít nejvýše 300 kB.");
    const mime = sniffImage(buf);
    if (!mime) throw badRequest("Logo musí být obrázek PNG nebo JPEG.");
    await getDb().update(processorProfiles).set({ logo: buf, logoMime: mime }).where(eq(processorProfiles.id, id));
  } else {
    await getDb().update(processorProfiles).set({ logo: null, logoMime: null }).where(eq(processorProfiles.id, id));
  }
}
