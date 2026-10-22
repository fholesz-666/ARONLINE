/**
 * Relace v cookie (HttpOnly, Secure, SameSite=Lax). V DB je uložen jen hash tokenu.
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { getConfig } from "../config";
import { forbidden, unauthorized } from "../http";
import { createSessionRecord, deleteSession, resolveSession, toPublicUser, type PublicUser } from "../services/auth";
import { getMembership, type MembershipInfo } from "../services/workspace";

export function sessionCookieName(): string {
  return getConfig().APP_URL.startsWith("https://") ? "__Host-aronline_sid" : "aronline_sid";
}

export async function startSession(userId: string, workspaceId: string | null) {
  const { token, expiresAt } = await createSessionRecord(userId, workspaceId);
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: getConfig().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await deleteSession(token);
  jar.delete(sessionCookieName());
}

export interface Current {
  user: PublicUser;
  sessionId: string;
  workspaceId: string | null;
}

/** Aktuálně přihlášený uživatel (v rámci jednoho požadavku se zjišťuje jen jednou). */
export const getCurrent = cache(async (): Promise<Current | null> => {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const row = await resolveSession(token);
  if (!row) return null;
  return { user: toPublicUser(row.user), sessionId: row.session.id, workspaceId: row.session.workspaceId };
});

export async function requireUser(): Promise<Current> {
  const c = await getCurrent();
  if (!c) throw unauthorized();
  return c;
}

export interface CurrentMember extends Current {
  workspaceId: string;
  membership: MembershipInfo;
}

/** Přihlášený uživatel a jeho členství v aktuálním workspace (ověřeno v DB). */
export async function requireMember(minRole: "MEMBER" | "ADMIN" | "OWNER" = "MEMBER"): Promise<CurrentMember> {
  const c = await requireUser();
  if (!c.workspaceId) throw forbidden("Nemáte vybraný pracovní prostor.");
  const membership = await getMembership(c.user.id, c.workspaceId);
  if (!membership) throw forbidden();
  const rank = { MEMBER: 0, ADMIN: 1, OWNER: 2 } as const;
  if (rank[membership.role] < rank[minRole]) throw forbidden();
  return { ...c, workspaceId: c.workspaceId, membership };
}

/** Registrovaný uživatel (ne host) – pro týmy, pozvánky a nákup balíčků/předplatného. */
export async function requireRegistered(): Promise<Current> {
  const c = await requireUser();
  if (c.user.isGuest) throw forbidden("Tato funkce vyžaduje registraci. Dokončete prosím účet v profilu.");
  return c;
}

/** Správce služby – role ADMIN a ověřený e-mail. */
export async function requireAdmin(): Promise<Current> {
  const c = await requireUser();
  if (c.user.role !== "ADMIN" || !c.user.emailVerified) throw forbidden();
  return c;
}

export function isAdmin(c: Current | null | undefined): boolean {
  return Boolean(c && c.user.role === "ADMIN" && c.user.emailVerified);
}
