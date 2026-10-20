/**
 * Pracovní prostory (workspace), členství a pozvánky.
 * Každý přístup k datům projektu MUSÍ projít `requireProjectAccess`.
 */
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { audit } from "../audit";
import { randomToken, sha256 } from "../auth/crypto";
import { getConfig } from "../config";
import { getDb } from "../db";
import { invitations, memberships, projects, users, workspaces } from "../db/schema";
import { badRequest, conflict, forbidden, notFound } from "../http";
import { mails, sendMail } from "../mail";
import { activeSubscription } from "./billing";

export interface MembershipInfo {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "PERSONAL" | "COMPANY";
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export async function getMembership(userId: string, workspaceId: string): Promise<MembershipInfo | null> {
  const rows = await getDb()
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceType: workspaces.type,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listWorkspaces(userId: string): Promise<MembershipInfo[]> {
  return getDb()
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceType: workspaces.type,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId));
}

/**
 * Vrátí projekt, pouze pokud patří do workspace, jehož je uživatel členem.
 * Pro cizí i neexistující projekt vrací stejnou chybu 404 (neprozrazuje existenci).
 */
export async function requireProjectAccess(userId: string, workspaceId: string, projectId: string) {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) throw forbidden();
  const project = await getDb().query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
  });
  if (!project) throw notFound("Projekt nebyl nalezen.");
  return project;
}

export async function createCompanyWorkspace(userId: string, name: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspaces).values({ name, type: "COMPANY" }).returning();
    await tx.insert(memberships).values({ userId, workspaceId: ws.id, role: "OWNER" });
    await audit("workspace.create", { userId, workspaceId: ws.id }, tx);
    return ws;
  });
}

export async function listMembers(workspaceId: string) {
  return getDb()
    .select({ userId: users.id, name: users.name, email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.workspaceId, workspaceId));
}

/** Maximální počet členů podle aktivního předplatného (bez předplatného 1). */
export async function memberLimit(workspaceId: string): Promise<number> {
  const sub = await activeSubscription(workspaceId);
  return sub?.product.maxMembers ?? 1;
}

export async function inviteMember(workspaceId: string, invitedById: string, email: string, role: "ADMIN" | "MEMBER") {
  const db = getDb();
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  if (!ws) throw notFound();
  if (ws.type !== "COMPANY") throw badRequest("Členy lze zvát jen do firemního prostoru.");
  const [{ n }] = await db.select({ n: count() }).from(memberships).where(eq(memberships.workspaceId, workspaceId));
  const pending = await db
    .select({ n: count() })
    .from(invitations)
    .where(and(eq(invitations.workspaceId, workspaceId), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())));
  const limit = await memberLimit(workspaceId);
  if (n + (pending[0]?.n ?? 0) >= limit) {
    throw conflict(`Váš tarif umožňuje nejvýše ${limit} členů. Pro více členů použijte firemní předplatné.`);
  }
  const token = randomToken();
  await db.insert(invitations).values({
    workspaceId,
    email: email.toLowerCase(),
    role,
    tokenHash: sha256(token),
    invitedById,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });
  const link = `${getConfig().APP_URL}/pozvanka?token=${encodeURIComponent(token)}`;
  await sendMail(mails.invitation(email, ws.name, link));
  await audit("workspace.invite", { userId: invitedById, workspaceId, meta: { role } });
}

export async function acceptInvitation(userId: string, userEmail: string, token: string) {
  const db = getDb();
  const inv = await db.query.invitations.findFirst({
    where: and(eq(invitations.tokenHash, sha256(token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())),
  });
  if (!inv) throw notFound("Pozvánka je neplatná nebo vypršela.");
  if (inv.email !== userEmail.toLowerCase()) throw forbidden("Pozvánka je určena pro jiný e-mail.");
  await db.transaction(async (tx) => {
    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));
    await tx
      .insert(memberships)
      .values({ userId, workspaceId: inv.workspaceId, role: inv.role })
      .onConflictDoNothing();
  });
  await audit("workspace.join", { userId, workspaceId: inv.workspaceId });
  return inv.workspaceId;
}

export async function removeMember(workspaceId: string, actorId: string, userId: string) {
  const db = getDb();
  const target = await getMembership(userId, workspaceId);
  if (!target) throw notFound();
  if (target.role === "OWNER") throw badRequest("Vlastníka nelze odebrat.");
  await db.delete(memberships).where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId)));
  await audit("workspace.remove_member", { userId: actorId, workspaceId });
}
