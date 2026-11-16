/**
 * Protokoly o určení vnějších vlivů (VV online).
 *
 * - Vyplnění je zdarma a bez registrace. Autor dostane odkaz s tajným tokenem (v DB jen SHA-256).
 * - Každý člen komise musí potvrdit, že se na určení vlivů podílel (zaškrtávací pole) – potvrzení
 *   se ukládají s časem a IP adresou jako doklad, že vlivy určila komise, nikoli provozovatel služby.
 * - Placená verze (premiumAt) odstraní reklamní patičku, přidá logo a export DOCX.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { committeeSize, zProtocolData, type VvProtocolData } from "@/core/vv/schema";
import { audit } from "../audit";
import { randomToken, safeEqual, sha256 } from "../auth/crypto";
import { getConfig } from "../config";
import { getDb } from "../db";
import { vvProtocols } from "../db/schema";
import { badRequest, notFound } from "../http";
import { errorMeta, log } from "../log";
import { mails, sendMail } from "../mail";
import { zEmail } from "./auth";
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
export async function createProtocol(raw: z.input<typeof zVvCreate>, ip: string) {
  const input = zVvCreate.parse(raw);
  checkConfirmations(input.data, input.confirmations);
  const token = randomToken();
  const [row] = await getDb()
    .insert(vvProtocols)
    .values({
      tokenHash: sha256(token),
      data: input.data,
      email: input.email,
      marketingConsent: input.marketingConsent,
      confirmations: confirmationRecord(input.data, ip),
    })
    .returning({ id: vvProtocols.id });
  await audit("vv.protocol_created", { meta: { id: row.id, spaces: input.data.spaces.length, marketing: input.marketingConsent } });
  const link = protocolLink(row.id, token);
  try {
    await sendMail(mails.vvProtocolCreated(input.email, input.data.object.name, link));
  } catch (e) {
    log.warn("vv_mail_failed", errorMeta(e));
  }
  return { id: row.id, token };
}

/** Načte protokol a ověří token. Neplatný token i neexistující protokol vrací stejnou chybu. */
export async function getProtocol(id: string, token: string | null | undefined): Promise<VvProtocolRow> {
  if (!token || token.length > 100 || !/^[\w-]{1,60}$/.test(id)) throw notFound("Protokol nebyl nalezen.");
  const row = await getDb().query.vvProtocols.findFirst({ where: eq(vvProtocols.id, id) });
  if (!row || !safeEqual(row.tokenHash, sha256(token))) throw notFound("Protokol nebyl nalezen.");
  return row;
}

export async function updateProtocol(id: string, token: string, raw: z.input<typeof zVvSave>, ip: string) {
  await getProtocol(id, token);
  const input = zVvSave.parse(raw);
  checkConfirmations(input.data, input.confirmations);
  await getDb()
    .update(vvProtocols)
    .set({ data: input.data, confirmations: confirmationRecord(input.data, ip) })
    .where(eq(vvProtocols.id, id));
  await audit("vv.protocol_updated", { meta: { id } });
}

export async function setProtocolLogo(id: string, token: string, buf: Buffer | null) {
  await getProtocol(id, token);
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
