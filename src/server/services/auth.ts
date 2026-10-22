/**
 * Uživatelské účty, relace, ověření e-mailu a obnova hesla.
 * Funkce nepracují s cookies – to dělá vrstva src/server/auth/session.ts.
 */
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../audit";
import { hashPassword, passwordProblem, randomToken, sha256, verifyPassword } from "../auth/crypto";
import { getConfig } from "../config";
import { getDb } from "../db";
import { emailTokens, memberships, processorProfiles, sessions, users, workspaces } from "../db/schema";
import { badRequest, conflict } from "../http";
import { mails, sendMail } from "../mail";

export const SESSION_DAYS = 30;
let dummyHash: Promise<string> | null = null;
/** Skutečný hash náhodného hesla – ověření proti němu trvá stejně dlouho jako u existujícího účtu. */
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

export const zEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Zadejte platný e-mail")
  .max(254);

export const zRegister = z.object({
  email: zEmail,
  password: z.string().min(1).max(200),
  name: z.string().trim().min(2, "Zadejte jméno").max(120),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je nutný souhlas s obchodními podmínkami" }) }),
});

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  isGuest: boolean;
};

export function toPublicUser(u: typeof users.$inferSelect): PublicUser {
  return {
    id: u.id,
    email: u.isGuest ? "" : u.email,
    name: u.name,
    role: u.role,
    emailVerified: u.emailVerifiedAt != null,
    isGuest: u.isGuest,
  };
}

/** Technická doména zástupných e-mailů hostů (RFC 2606 – nikdy nedoručitelná). */
export const GUEST_EMAIL_DOMAIN = "host.aronline.invalid";

export const zGuest = z.object({
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je nutný souhlas s obchodními podmínkami" }) }),
});

/**
 * Host bez registrace: vytvoří anonymní účet s vlastním pracovním prostorem.
 * Host smí koupit jen jednorázovou analýzu (viz payments/service.ts). Přístup je vázán
 * na relaci v prohlížeči; host si může účet kdykoli dokončit (upgradeGuest).
 */
export async function createGuestUser() {
  const db = getDb();
  const c = getConfig();
  const suffix = randomToken().slice(0, 16).toLowerCase().replace(/[^a-z0-9]/g, "x");
  const passwordHash = await hashPassword(randomToken()); // heslo nikdo nezná – přihlášení jen relací
  const { user, workspace } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: `host-${suffix}@${GUEST_EMAIL_DOMAIN}`,
        name: "Host",
        passwordHash,
        isGuest: true,
        termsVersion: c.TERMS_VERSION,
        termsAcceptedAt: new Date(),
      })
      .returning();
    const [workspace] = await tx.insert(workspaces).values({ name: "Host", type: "PERSONAL" }).returning();
    await tx.insert(memberships).values({ userId: user.id, workspaceId: workspace.id, role: "OWNER" });
    await tx.insert(processorProfiles).values({ workspaceId: workspace.id, isDefault: true, data: {} });
    return { user, workspace };
  });
  await audit("user.guest_created", { userId: user.id, workspaceId: workspace.id });
  return { user, workspace };
}

export const zUpgradeGuest = z.object({
  email: zEmail,
  password: z.string().min(1).max(200),
  name: z.string().trim().min(2, "Zadejte jméno").max(120),
});

/** Dokončení registrace hosta – projekty, odemčení a objednávky zůstávají zachovány. */
export async function upgradeGuest(userId: string, rawInput: z.infer<typeof zUpgradeGuest>) {
  const input = { ...rawInput, email: rawInput.email.trim().toLowerCase(), name: rawInput.name.trim() };
  const problem = passwordProblem(input.password);
  if (problem) throw badRequest(problem, [{ path: "password", message: problem }]);
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !user.isGuest) throw badRequest("Účet už je zaregistrovaný.");
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw conflict("Účet s tímto e-mailem již existuje. Přihlaste se nebo obnovte heslo.");
  const c = getConfig();
  const passwordHash = await hashPassword(input.password);
  const [updated] = await db
    .update(users)
    .set({
      email: input.email,
      name: input.name,
      passwordHash,
      isGuest: false,
      role: c.adminEmails.includes(input.email) ? "ADMIN" : "USER",
    })
    .where(eq(users.id, userId))
    .returning();
  const ws = await defaultWorkspaceId(userId);
  if (ws) await db.update(workspaces).set({ name: input.name }).where(eq(workspaces.id, ws));
  await audit("user.guest_upgraded", { userId });
  await sendVerificationEmail(updated.id, updated.email);
  return updated;
}

export async function registerUser(rawInput: z.infer<typeof zRegister>) {
  const input = { ...rawInput, email: rawInput.email.trim().toLowerCase(), name: rawInput.name.trim() };
  const problem = passwordProblem(input.password);
  if (problem) throw badRequest(problem, [{ path: "password", message: problem }]);
  const db = getDb();
  const c = getConfig();
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw conflict("Účet s tímto e-mailem již existuje. Přihlaste se nebo obnovte heslo.");
  const passwordHash = await hashPassword(input.password);
  const role = c.adminEmails.includes(input.email) ? "ADMIN" : "USER";
  const { user, workspace } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
        role,
        termsVersion: c.TERMS_VERSION,
        termsAcceptedAt: new Date(),
      })
      .returning();
    const [workspace] = await tx.insert(workspaces).values({ name: input.name, type: "PERSONAL" }).returning();
    await tx.insert(memberships).values({ userId: user.id, workspaceId: workspace.id, role: "OWNER" });
    await tx.insert(processorProfiles).values({
      workspaceId: workspace.id,
      isDefault: true,
      data: { fullName: input.name, email: input.email },
    });
    return { user, workspace };
  });
  await audit("user.register", { userId: user.id, workspaceId: workspace.id });
  await sendVerificationEmail(user.id, user.email);
  return { user, workspace };
}

export async function authenticate(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || user.disabledAt || user.isGuest) {
    await verifyPassword(await getDummyHash(), password); // vyrovnání časování
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return null;
  return promoteOwnerAdmin(user);
}

/** Účty uvedené v ADMIN_EMAILS (a vlastník služby) dostanou roli správce, jakmile mají ověřený e-mail. */
async function promoteOwnerAdmin(user: typeof users.$inferSelect) {
  if (user.role === "ADMIN" || !user.emailVerifiedAt || user.isGuest) return user;
  if (!getConfig().adminEmails.includes(user.email.toLowerCase())) return user;
  const [u] = await getDb().update(users).set({ role: "ADMIN" }).where(eq(users.id, user.id)).returning();
  await audit("user.promoted_admin", { userId: user.id });
  return u;
}

export async function defaultWorkspaceId(userId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: workspaces.id, type: workspaces.type })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId));
  return (rows.find((r) => r.type === "PERSONAL") ?? rows[0])?.id ?? null;
}

export async function createSessionRecord(userId: string, workspaceId: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await getDb().insert(sessions).values({ tokenHash: sha256(token), userId, workspaceId, expiresAt });
  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined | null) {
  if (!token || token.length > 200) return null;
  const db = getDb();
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.user.disabledAt) return null;
  // posun „naposledy viděno“ max. jednou za 10 minut
  if (Date.now() - row.session.lastSeenAt.getTime() > 10 * 60 * 1000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.session.id));
  }
  return row;
}

export async function deleteSession(token: string) {
  await getDb().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function setSessionWorkspace(sessionId: string, workspaceId: string) {
  await getDb().update(sessions).set({ workspaceId }).where(eq(sessions.id, sessionId));
}

/* --- E-mailové tokeny ------------------------------------------------ */

async function createEmailToken(userId: string, type: "VERIFY_EMAIL" | "RESET_PASSWORD", ttlMs: number) {
  const token = randomToken();
  await getDb()
    .insert(emailTokens)
    .values({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

async function consumeEmailToken(token: string, type: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const db = getDb();
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailTokens.tokenHash, sha256(token)),
        eq(emailTokens.type, type),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return row ?? null;
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = await createEmailToken(userId, "VERIFY_EMAIL", 48 * 3600 * 1000);
  const link = `${getConfig().APP_URL}/overeni-emailu?token=${encodeURIComponent(token)}`;
  await sendMail(mails.verifyEmail(email, link));
}

export async function verifyEmail(token: string): Promise<boolean> {
  const row = await consumeEmailToken(token, "VERIFY_EMAIL");
  if (!row) return false;
  const [u] = await getDb().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId)).returning();
  await audit("user.email_verified", { userId: row.userId });
  if (u) await promoteOwnerAdmin(u);
  return true;
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await getDb().query.users.findFirst({ where: eq(users.email, email) });
  if (!user || user.disabledAt || user.isGuest) return; // neprozrazujeme existenci účtu
  const token = await createEmailToken(user.id, "RESET_PASSWORD", 3600 * 1000);
  const link = `${getConfig().APP_URL}/obnova-hesla?token=${encodeURIComponent(token)}`;
  await sendMail(mails.resetPassword(user.email, link));
  await audit("user.password_reset_requested", { userId: user.id });
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const problem = passwordProblem(newPassword);
  if (problem) throw badRequest(problem, [{ path: "password", message: problem }]);
  const row = await consumeEmailToken(token, "RESET_PASSWORD");
  if (!row) return false;
  const db = getDb();
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  // zneplatnit všechny relace
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  await audit("user.password_reset", { userId: row.userId });
  return true;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw badRequest("Současné heslo není správné.", [{ path: "currentPassword", message: "Nesprávné heslo" }]);
  }
  const problem = passwordProblem(newPassword);
  if (problem) throw badRequest(problem, [{ path: "newPassword", message: problem }]);
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, userId));
  await audit("user.password_changed", { userId });
}

/** Doba, po které se maže nedokončený účet hosta bez jakékoli objednávky (viz Zásady ochrany OÚ). */
export const GUEST_RETENTION_DAYS = 60;

/**
 * Smaže účty hostů bez objednávky, kteří nebyli aktivní GUEST_RETENTION_DAYS dní.
 * Hosté s objednávkou (zaplacenou i nezaplacenou) zůstávají kvůli účetní evidenci.
 */
export async function purgeStaleGuests(now = new Date()): Promise<number> {
  const db = getDb();
  const cutoff = new Date(now.getTime() - GUEST_RETENTION_DAYS * 24 * 3600 * 1000);
  const rows = await db.execute<{ id: string }>(sql`
    select u.id from users u
    where u.is_guest = true and u.created_at < ${cutoff}
      and not exists (select 1 from sessions s where s.user_id = u.id and s.last_seen_at >= ${cutoff})
      and not exists (select 1 from orders o where o.user_id = u.id)
    limit 500`);
  let n = 0;
  for (const { id } of rows.rows) {
    try {
      await db.transaction(async (tx) => {
        const ws = await tx.select({ id: memberships.workspaceId }).from(memberships).where(eq(memberships.userId, id));
        for (const w of ws) await tx.delete(workspaces).where(and(eq(workspaces.id, w.id), eq(workspaces.type, "PERSONAL")));
        await tx.delete(users).where(and(eq(users.id, id), eq(users.isGuest, true)));
      });
      n++;
    } catch {
      // projekt s vazbou, kterou nelze smazat – necháme na ruční kontrolu
    }
  }
  if (n) await audit("user.guests_purged", { meta: { count: n } });
  return n;
}
