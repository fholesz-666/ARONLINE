/**
 * Protokoly o určení vnějších vlivů (VV online).
 *
 * - Vyplnění je zdarma a bez registrace. Autor dostane odkaz s tajným tokenem (v DB jen SHA-256).
 * - Každý člen komise musí potvrdit, že se na určení vlivů podílel (zaškrtávací pole) – potvrzení
 *   se ukládají s časem a IP adresou jako doklad, že vlivy určila komise, nikoli provozovatel služby.
 * - Placená verze (premiumAt) odstraní reklamní patičku, přidá logo a export DOCX.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { committeeSize, zProtocolData, type VvProtocolData } from "@/core/vv/schema";
import { audit } from "../audit";
import { randomToken, safeEqual, sha256 } from "../auth/crypto";
import { getConfig } from "../config";
import { getDb } from "../db";
import { creditLedger, vvProtocols } from "../db/schema";
import { badRequest, conflict, notFound, paymentRequired } from "../http";
import { errorMeta, log } from "../log";
import { mails, sendMail } from "../mail";
import { zEmail } from "./auth";
import { creditBalance } from "./billing";
import { sniffImage } from "./profiles";

export type VvProtocolRow = typeof vvProtocols.$inferSelect;

export const VV_CONFIRMATION_TEXT =
  "Potvrzuji, že jsem jako člen komise posoudil(a) uvedené prostory a souhlasím s určením vnějších vlivů v tomto protokolu.";

export const zVvSave = z.object({
  data: zProtocolData,
  /** Potvrzení jednotlivých členů komise (předseda + členové, ve stejném pořadí) */
  confirmations: z.array(z.boolean()).max(9),
});

export const zVvCreate = zVvSave.extend({
  email: zEmail,
  marketingConsent: z.boolean().default(false),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je nutný souhlas s podmínkami služby" }) }),
});

function checkConfirmations(data: VvProtocolData, confirmations: boolean[]) {
  const n = committeeSize(data);
  if (confirmations.length !== n || confirmations.some((c) => c !== true)) {
    throw badRequest("Protokol musí potvrdit všichni členové komise.", [
      { path: "confirmations", message: "Zaškrtněte potvrzení u každého člena komise" },
    ]);
  }
}

function confirmationRecord(data: VvProtocolData, ip: string) {
  return {
    text: VV_CONFIRMATION_TEXT,
    at: new Date().toISOString(),
    ip,
    members: [data.committee.chair, ...data.committee.members].map((m) => m.name),
  };
}

export function protocolLink(id: string, token: string): string {
  // token ve fragmentu (#) se neposílá na server ani do logů
  return `${getConfig().APP_URL.replace(/\/$/, "")}/vnejsi-vlivy/protokol/${id}#t=${token}`;
}

/**
 * `raw` je tělo požadavku už ověřené schématem (readJson); typ readJson ale odpovídá vstupu schématu,
 * proto se zde ještě jednou parsuje, aby platily výchozí hodnoty i typy výstupu.
 */
export async function createProtocol(raw: z.input<typeof zVvCreate>, ip: string, ownerId: string | null = null) {
  const input = zVvCreate.parse(raw);
  checkConfirmations(input.data, input.confirmations);
  const token = randomToken();
  const [row] = await getDb()
    .insert(vvProtocols)
    .values({
      tokenHash: sha256(token),
      userId: ownerId,
      data: input.data,
      email: input.email,
      marketingConsent: input.marketingConsent,
      confirmations: confirmationRecord(input.data, ip),
    })
    .returning({ id: vvProtocols.id });
  await audit("vv.protocol_created", { meta: { id: row.id, spaces: input.data.spaces.length, marketing: input.marketingConsent } });
  const link = protocolLink(row.id, token);
  // E-mail s odkazem posíláme na pozadí – pomalé nebo nedostupné SMTP nesmí zdržet uložení protokolu.
  void sendMail(mails.vvProtocolCreated(input.email, input.data.object.name, link)).catch((e) => log.warn("vv_mail_failed", errorMeta(e)));
  return { id: row.id, token };
}

/**
 * Načte protokol a ověří přístup: platný token z odkazu, nebo přihlášený vlastník (`ownerId`).
 * Neplatný token i neexistující protokol vrací stejnou chybu.
 */
export async function getProtocol(id: string, token: string | null | undefined, ownerId?: string | null): Promise<VvProtocolRow> {
  if (!/^[\w-]{1,60}$/.test(id) || (token && token.length > 100)) throw notFound("Protokol nebyl nalezen.");
  const row = await getDb().query.vvProtocols.findFirst({ where: eq(vvProtocols.id, id) });
  if (!row) throw notFound("Protokol nebyl nalezen.");
  const byToken = !!token && safeEqual(row.tokenHash, sha256(token));
  const byOwner = !!ownerId && row.userId === ownerId;
  if (!byToken && !byOwner) throw notFound("Protokol nebyl nalezen.");
  return row;
}

/** Protokol otevřený přes odkaz přihlášeným uživatelem bez vlastníka se přiřadí k jeho účtu. */
export async function claimProtocol(row: VvProtocolRow, userId: string | null | undefined): Promise<VvProtocolRow> {
  if (!userId || row.userId) return row;
  await getDb()
    .update(vvProtocols)
    .set({ userId })
    .where(and(eq(vvProtocols.id, row.id), isNull(vvProtocols.userId)));
  await audit("vv.protocol_claimed", { userId, meta: { id: row.id } });
  return { ...row, userId };
}

export async function listUserProtocols(userId: string) {
  const rows = await getDb()
    .select({ id: vvProtocols.id, data: vvProtocols.data, premiumAt: vvProtocols.premiumAt, createdAt: vvProtocols.createdAt, updatedAt: vvProtocols.updatedAt })
    .from(vvProtocols)
    .where(eq(vvProtocols.userId, userId))
    .orderBy(desc(vvProtocols.updatedAt))
    .limit(200);
  return rows.map((r) => {
    const d = r.data as VvProtocolData;
    return { id: r.id, name: d.object.name, address: d.object.address, number: d.object.number, spaces: d.spaces.length, premium: r.premiumAt != null, updatedAt: r.updatedAt };
  });
}

/**
 * Odemknutí placené verze kreditem z workspace přihlášeného uživatele
 * (kredity přiděluje i správce v administraci). Idempotentní: protokol se odečte nejvýš jednou.
 */
export async function redeemWithCredit(id: string, token: string | null, viewer: { userId: string; workspaceId: string }) {
  const row = await getProtocol(id, token, viewer.userId);
  if (row.premiumAt) throw conflict("Protokol už je v placené verzi.");
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"unlock:" + viewer.workspaceId}))`);
    const balance = await creditBalance(viewer.workspaceId, tx);
    if (balance < 1) throw paymentRequired("Na účtu nemáte žádný kredit.");
    const d = row.data as VvProtocolData;
    await tx
      .insert(creditLedger)
      .values({
        workspaceId: viewer.workspaceId,
        delta: -1,
        reason: "UNLOCK",
        idempotencyKey: `vv:${row.id}`,
        note: `Protokol VV – ${d.object.name}`.slice(0, 200),
      })
      .onConflictDoNothing({ target: creditLedger.idempotencyKey });
    await tx
      .update(vvProtocols)
      .set({ premiumAt: new Date(), userId: row.userId ?? viewer.userId })
      .where(eq(vvProtocols.id, row.id));
    await audit("vv.protocol_redeemed", { userId: viewer.userId, workspaceId: viewer.workspaceId, meta: { id: row.id } }, tx);
  });
}

export async function updateProtocol(id: string, token: string | null, raw: z.input<typeof zVvSave>, ip: string, ownerId?: string | null) {
  await getProtocol(id, token, ownerId);
  const input = zVvSave.parse(raw);
  checkConfirmations(input.data, input.confirmations);
  await getDb()
    .update(vvProtocols)
    .set({ data: input.data, confirmations: confirmationRecord(input.data, ip) })
    .where(eq(vvProtocols.id, id));
  await audit("vv.protocol_updated", { meta: { id } });
}

export async function setProtocolLogo(id: string, token: string | null, buf: Buffer | null, ownerId?: string | null) {
  await getProtocol(id, token, ownerId);
  if (!buf) {
    await getDb().update(vvProtocols).set({ logo: null, logoMime: null }).where(eq(vvProtocols.id, id));
    return;
  }
  if (buf.length > 300_000) throw badRequest("Logo může mít nejvýše 300 kB.");
  const mime = sniffImage(buf);
  if (!mime) throw badRequest("Logo musí být obrázek PNG nebo JPEG.");
  await getDb().update(vvProtocols).set({ logo: buf, logoMime: mime }).where(eq(vvProtocols.id, id));
}

/** Údaje protokolu pro klienta (bez tokenu a loga). */
export function publicProtocol(row: VvProtocolRow) {
  return {
    id: row.id,
    data: row.data as VvProtocolData,
    email: row.email,
    premium: row.premiumAt != null,
    premiumAt: row.premiumAt,
    hasLogo: row.logo != null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function protocolFileName(row: VvProtocolRow, ext: "pdf" | "docx"): string {
  const d = row.data as VvProtocolData;
  const base = (d.object.number || d.object.name || "protokol")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 60);
  return `Protokol_VV_${base}.${ext}`;
}
