/**
 * Konfigurace serveru z proměnných prostředí (validováno při prvním použití).
 * Tajné hodnoty se nikdy nelogují.
 */
import { z } from "zod";

const bool = (def: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v == null ? def : v === "true" || v === "1"));

const envSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  /** development | test | staging | production */
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  /** Platby: mock (jen vývoj/test), sandbox (GoPay testovací prostředí), production */
  PAYMENTS_MODE: z.enum(["mock", "sandbox", "production"]).default("mock"),
  GOPAY_GOID: z.string().optional(),
  GOPAY_CLIENT_ID: z.string().optional(),
  GOPAY_CLIENT_SECRET: z.string().optional(),
  /** Povolit předplatné přes opakované platby GoPay (v produkci nutná aktivace u GoPay). */
  GOPAY_RECURRENCE_ENABLED: bool(true),
  /** Blokovat platby a export, dokud není výpočetní jádro odborně ověřeno. */
  REQUIRE_VERIFIED_CORE: bool(true),
  /** Rozsah náhledu výsledku před zaplacením: summary | full */
  PREVIEW_DETAIL: z.enum(["summary", "full"]).default("summary"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: bool(false),
  MAIL_FROM: z.string().default("ARONLINE <no-reply@localhost>"),
  /** Verze obchodních podmínek, se kterou uživatel souhlasí při registraci. */
  TERMS_VERSION: z.string().default("2026-10-návrh"),
  /** Identifikace provozovatele pro patičku a doklady. */
  OPERATOR_NAME: z.string().default("Provozovatel (doplnit)"),
  OPERATOR_ICO: z.string().default(""),
  OPERATOR_ADDRESS: z.string().default(""),
  OPERATOR_EMAIL: z.string().default(""),
  /** E-maily správců (role ADMIN se přidělí při registraci). */
  ADMIN_EMAILS: z.string().default(""),
});

export type AppConfig = z.infer<typeof envSchema> & {
  isProduction: boolean;
  gopayConfigured: boolean;
  adminEmails: string[];
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Neplatná konfigurace prostředí: ${fields}`);
  }
  const c = parsed.data;
  const isProduction = c.APP_ENV === "production";
  if (isProduction && c.PAYMENTS_MODE === "mock") {
    throw new Error("PAYMENTS_MODE=mock není v produkci povolen");
  }
  const gopayConfigured = Boolean(c.GOPAY_GOID && c.GOPAY_CLIENT_ID && c.GOPAY_CLIENT_SECRET);
  if (c.PAYMENTS_MODE !== "mock" && !gopayConfigured) {
    // Aplikace poběží, ale platby budou nedostupné (viz /app/predplatne).
    console.warn("[config] GoPay není nakonfigurován – platby nebudou dostupné.");
  }
  cached = {
    ...c,
    isProduction,
    gopayConfigured,
    adminEmails: c.ADMIN_EMAILS.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
  return cached;
}

/** Pro testy – vynutí nové načtení konfigurace. */
export function resetConfigForTests() {
  cached = null;
}
