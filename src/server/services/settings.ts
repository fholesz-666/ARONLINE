/**
 * Nastavení webu upravitelné správcem: provozovatel, bankovní účet, doklady a texty.
 * Hodnoty v DB mají přednost před výchozími (src/config/operator.ts, src/config/site-texts.ts).
 * Krátká mezipaměť v procesu; uložení ji okamžitě zneplatní.
 */
import { z } from "zod";
import { OPERATOR } from "@/config/operator";
import { defaultTexts, SITE_TEXTS, type SiteTexts } from "@/config/site-texts";
import { czIban, formatCzAccount, parseCzAccount } from "@/domain/bank";
import { audit } from "../audit";
import { getDb } from "../db";
import { siteSettings } from "../db/schema";
import { badRequest } from "../http";
import { errorMeta, log } from "../log";

export const zOperatorSettings = z.object({
  name: z.string().trim().min(2).max(160),
  ico: z.string().trim().regex(/^\d{8}$|^$/, "IČO má 8 číslic"),
  dic: z.string().trim().max(20).default(""),
  address: z.string().trim().max(300),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40),
  /** Údaj o zápisu do rejstříku (povinný údaj na dokladu). */
  registry: z.string().trim().max(300),
  vatPayer: z.boolean(),
});
export type OperatorSettings = z.infer<typeof zOperatorSettings>;

export const zBankSettings = z.object({
  /** Platba převodem povolena */
  enabled: z.boolean(),
  /** Číslo účtu ve tvaru [předčíslí-]číslo/kód banky */
  account: z.string().trim().max(40),
  /** Splatnost objednávky převodem ve dnech */
  dueDays: z.number().int().min(1).max(60),
});
export type BankSettings = z.infer<typeof zBankSettings> & { iban: string; accountValid: boolean };

export const zInvoiceSettings = z.object({
  /** Poznámka na dokladu (např. „Nejsem plátce DPH.“) */
  note: z.string().trim().max(500),
});
export type InvoiceSettings = z.infer<typeof zInvoiceSettings>;

const zTexts = z.record(z.string(), z.string().max(4000));

export interface SiteSettings {
  operator: OperatorSettings;
  bank: BankSettings;
  invoice: InvoiceSettings;
  texts: SiteTexts;
}

export function defaultSettings(): SiteSettings {
  return {
    operator: {
      name: OPERATOR.name,
      ico: OPERATOR.ico,
      dic: "",
      address: OPERATOR.address,
      email: OPERATOR.email,
      phone: OPERATOR.phone,
      registry: "Fyzická osoba podnikající podle živnostenského zákona, zapsaná v živnostenském rejstříku.",
      vatPayer: process.env.OPERATOR_VAT_PAYER === "true",
    },
    bank: withIban({ enabled: true, account: process.env.BANK_ACCOUNT || "242406724/0300", dueDays: 7 }),
    invoice: { note: "" },
    texts: defaultTexts(),
  };
}

function withIban(b: z.infer<typeof zBankSettings>): BankSettings {
  const acc = parseCzAccount(b.account);
  return { ...b, account: acc ? formatCzAccount(acc) : b.account, iban: acc ? czIban(acc) : "", accountValid: acc != null };
}

let cache: { at: number; value: SiteSettings } | null = null;
const TTL_MS = 30_000;

export function invalidateSettingsCache() {
  cache = null;
}

/** Načte nastavení (při nedostupné DB vrátí výchozí hodnoty – web se nesmí rozbít). */
export async function getSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const d = defaultSettings();
  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await getDb().select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  } catch (e) {
    log.warn("settings_load_failed", errorMeta(e));
    return d;
  }
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const op = zOperatorSettings.partial().safeParse(map.get("operator") ?? {});
  const bank = zBankSettings.partial().safeParse(map.get("bank") ?? {});
  const inv = zInvoiceSettings.partial().safeParse(map.get("invoice") ?? {});
  const texts = zTexts.safeParse(map.get("texts") ?? {});
  const t = { ...d.texts };
  if (texts.success) {
    for (const [k, v] of Object.entries(texts.data)) {
      if (k in SITE_TEXTS && v.trim() !== "") t[k as keyof SiteTexts] = v;
    }
  }
  const value: SiteSettings = {
    operator: { ...d.operator, ...(op.success ? stripEmpty(op.data) : {}) },
    bank: withIban({ ...d.bank, ...(bank.success ? stripEmpty(bank.data) : {}) }),
    invoice: { ...d.invoice, ...(inv.success ? inv.data : {}) },
    texts: t,
  };
  // vypnuté hodnoty typu boolean nesmí stripEmpty zahodit
  if (op.success && typeof op.data.vatPayer === "boolean") value.operator.vatPayer = op.data.vatPayer;
  if (bank.success && typeof bank.data.enabled === "boolean") value.bank.enabled = bank.data.enabled;
  cache = { at: Date.now(), value };
  return value;
}

function stripEmpty<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}

/** Surové uložené texty (pro editor – prázdné = výchozí). */
export async function getStoredTexts(): Promise<Record<string, string>> {
  const row = await getDb().query.siteSettings.findFirst({ where: (t, { eq }) => eq(t.key, "texts") });
  const p = zTexts.safeParse(row?.value ?? {});
  return p.success ? p.data : {};
}

export const zSettingsUpdate = z.object({
  operator: zOperatorSettings.optional(),
  bank: zBankSettings.optional(),
  invoice: zInvoiceSettings.optional(),
  texts: zTexts.optional(),
});

export async function saveSettings(input: z.input<typeof zSettingsUpdate>, userId: string) {
  if (input.bank && input.bank.account && !parseCzAccount(input.bank.account)) {
    throw badRequest("Neplatné číslo účtu.", [{ path: "bank.account", message: "Zadejte účet ve tvaru 123456789/0300 (kontrola podle ČNB nevyšla)." }]);
  }
  if (input.bank?.enabled && !input.bank.account) {
    throw badRequest("Pro platbu převodem vyplňte číslo účtu.", [{ path: "bank.account", message: "Chybí číslo účtu" }]);
  }
  const db = getDb();
  const entries: [string, unknown][] = [];
  if (input.operator) entries.push(["operator", input.operator]);
  if (input.bank) entries.push(["bank", input.bank]);
  if (input.invoice) entries.push(["invoice", input.invoice]);
  if (input.texts) {
    const clean = Object.fromEntries(Object.entries(input.texts).filter(([k]) => k in SITE_TEXTS));
    entries.push(["texts", clean]);
  }
  for (const [key, value] of entries) {
    await db
      .insert(siteSettings)
      .values({ key, value: value as object, updatedById: userId })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: value as object, updatedById: userId, updatedAt: new Date() } });
  }
  invalidateSettingsCache();
  await audit("admin.settings_update", { userId, meta: { keys: entries.map(([k]) => k) } });
}
