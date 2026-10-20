import type { VerificationRecord } from "../../types";
import { canonicalJson, sha256Hex } from "../../../util/sha256";
import { ALL_EQUATIONS } from "./equations";
import { ALL_TABLES } from "./tables";
import verificationFile from "./verification.json";

export interface VerificationItem {
  id: string;
  kind: "table" | "equation";
  symbol: string;
  title: string;
  normRef: string;
  provenance: string;
  publicSources: { title: string; url?: string; locator?: string }[];
  verification: VerificationRecord;
}

const records = (verificationFile as { items: Record<string, VerificationRecord> }).items;

export function getVerificationRecord(id: string): VerificationRecord {
  return records[id] ?? { status: "unverified" };
}

export function listVerificationItems(): VerificationItem[] {
  const tables: VerificationItem[] = ALL_TABLES.map((t) => ({
    id: t.id,
    kind: "table",
    symbol: t.symbol,
    title: t.title,
    normRef: t.normRef,
    provenance: t.provenance,
    publicSources: t.publicSources,
    verification: getVerificationRecord(t.id),
  }));
  const eqs: VerificationItem[] = ALL_EQUATIONS.map((e) => ({
    id: e.id,
    kind: "equation",
    symbol: e.symbol,
    title: e.formula,
    normRef: e.normRef,
    provenance: e.provenance,
    publicSources: e.publicSources,
    verification: getVerificationRecord(e.id),
  }));
  return [...tables, ...eqs];
}

export interface VerificationSummary {
  total: number;
  verified: number;
  unverified: number;
  rejected: number;
  /** true jen tehdy, když jsou ověřeny všechny tabulky i rovnice. */
  fullyVerified: boolean;
}

export function getVerificationSummary(): VerificationSummary {
  const items = listVerificationItems();
  const verified = items.filter((i) => i.verification.status === "verified").length;
  const rejected = items.filter((i) => i.verification.status === "rejected").length;
  return {
    total: items.length,
    verified,
    rejected,
    unverified: items.length - verified - rejected,
    fullyVerified: verified === items.length,
  };
}

/**
 * Otisk normativních dat (hodnoty tabulek, vzorce, stav ověření).
 * Ukládá se ke každému výpočtu kvůli dohledatelnosti.
 */
export const NORMATIVE_DATA_HASH: string = sha256Hex(
  canonicalJson({
    tables: ALL_TABLES.map((t) => ({ id: t.id, rows: Object.fromEntries(Object.entries(t.rows).map(([k, r]) => [k, (r as { value: unknown }).value])) })),
    equations: ALL_EQUATIONS.map((e) => ({ id: e.id, formula: e.formula })),
    verification: records,
  }),
).slice(0, 16);
