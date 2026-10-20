/**
 * Společné typy výpočetního jádra.
 * Jádro nesmí importovat nic z frameworku, databáze ani sítě.
 */

export type VerificationStatus = "unverified" | "verified" | "rejected";

export interface PublicSource {
  title: string;
  url?: string;
  /** Přesnější umístění ve zdroji (strana, tabulka). */
  locator?: string;
  /** Datum, kdy byl zdroj zkontrolován (ISO). */
  checkedAt?: string;
}

export interface VerificationRecord {
  status: VerificationStatus;
  /** Kdo ověřil (jméno, autorizace) – vyplní odborník. */
  verifiedBy?: string;
  /** Datum ověření (ISO). */
  verifiedAt?: string;
  /** Proti jakému dokumentu bylo ověřeno (např. „ČSN EN 62305-2 ed. 2, únor 2013“). */
  verifiedAgainst?: string;
  note?: string;
}

export interface TableRow<V = number> {
  label: string;
  value: V;
  /** Doplňující vysvětlení pro projektanta (vlastní text, ne citace normy). */
  help?: string;
}

/** Normová tabulka s původem hodnot a stavem ověření. */
export interface NormTable<K extends string = string, V = number> {
  /** Interní ID, např. "ED2.A.1". */
  id: string;
  /** Symbol veličiny, např. "CD". */
  symbol: string;
  title: string;
  /** Odkaz do normy, např. „ČSN EN 62305-2 ed. 2, tab. A.1“. */
  normRef: string;
  rows: Record<K, TableRow<V>>;
  /** Veřejné sekundární zdroje, se kterými byly hodnoty porovnány. */
  publicSources: PublicSource[];
  /** Popis, odkud hodnoty v kódu pocházejí. */
  provenance: string;
}

/** Normová rovnice s původem a stavem ověření. */
export interface NormEquation {
  id: string;
  symbol: string;
  /** Lidsky čitelný vzorec. */
  formula: string;
  normRef: string;
  publicSources: PublicSource[];
  provenance: string;
}

export type ValueSource =
  | { kind: "user"; note?: string }
  | { kind: "table"; tableId: string; rowKey: string; normRef: string }
  | { kind: "computed"; equationId: string }
  | { kind: "auto"; provider: string; retrievedAt?: string; quality?: string }
  | { kind: "default"; note: string };

export interface TraceInput {
  symbol: string;
  value: number;
  unit?: string;
  source: ValueSource;
  label?: string;
}

/** Jeden krok výpočtu ve stopě. */
export interface TraceStep {
  /** Unikátní klíč kroku, např. "Z2.RB" nebo "line:nn.NL". */
  key: string;
  symbol: string;
  label: string;
  value: number;
  unit?: string;
  formula: string;
  /** Vzorec s dosazenými hodnotami. */
  substituted: string;
  equationId?: string;
  normRef?: string;
  inputs: TraceInput[];
  notes?: string[];
}

export type Severity = "info" | "warning" | "error";

export interface CalcMessage {
  severity: Severity;
  code: string;
  message: string;
  /** Cesta k vstupu, kterého se zpráva týká (např. "lines[0].length"). */
  path?: string;
}
