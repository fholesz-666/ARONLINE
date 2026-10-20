/**
 * Jednoduchý strukturovaný logger s redakcí citlivých údajů.
 * Nikdy nelogujte hesla, tokeny, klíče ani obsah projektů.
 */
const SENSITIVE_KEYS = /pass|secret|token|authorization|cookie|key|hash|iban|card/i;
const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[…]";
  if (typeof value === "string") return value.replace(EMAIL_RE, "$1***@$2");
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, event: string, meta?: Record<string, unknown>) {
  if (process.env.APP_ENV === "test" && level === "debug") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...(meta ? (redact(meta) as object) : {}) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (process.env.APP_ENV !== "test") console.log(line);
}

export const log = {
  debug: (event: string, meta?: Record<string, unknown>) => write("debug", event, meta),
  info: (event: string, meta?: Record<string, unknown>) => write("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => write("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) => write("error", event, meta),
};

export function errorMeta(e: unknown): Record<string, unknown> {
  if (e instanceof Error) return { error: e.name, message: e.message.slice(0, 300) };
  return { error: String(e).slice(0, 300) };
}
