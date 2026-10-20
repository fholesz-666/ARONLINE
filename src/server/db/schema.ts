/**
 * Datový model ARONLINE (Drizzle ORM, PostgreSQL).
 * Migrace: `npm run db:generate` (vytvoří SQL v ./drizzle), `npm run db:migrate` (aplikuje).
 */
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());
const ts = (name: string) => timestamp(name, { withTimezone: true });

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/* ------------------------------------------------------------------ */
/* Uživatelé                                                          */
/* ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", ["USER", "ADMIN"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("USER"),
  emailVerifiedAt: ts("email_verified_at"),
  termsVersion: text("terms_version"),
  termsAcceptedAt: ts("terms_accepted_at"),
  disabledAt: ts("disabled_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id"),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const emailTokenType = pgEnum("email_token_type", ["VERIFY_EMAIL", "RESET_PASSWORD"]);

export const emailTokens = pgTable(
  "email_tokens",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: emailTokenType("type").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("email_tokens_user_type_idx").on(t.userId, t.type)],
);

/* ------------------------------------------------------------------ */
/* Workspace                                                          */
/* ------------------------------------------------------------------ */

export const workspaceType = pgEnum("workspace_type", ["PERSONAL", "COMPANY"]);
export const memberRole = pgEnum("member_role", ["OWNER", "ADMIN", "MEMBER"]);

export const workspaces = pgTable("workspaces", {
  id: id(),
  name: text("name").notNull(),
  type: workspaceType("type").notNull().default("PERSONAL"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("MEMBER"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("memberships_user_ws_uq").on(t.userId, t.workspaceId), index("memberships_ws_idx").on(t.workspaceId)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("MEMBER"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedById: text("invited_by_id").notNull(),
    expiresAt: ts("expires_at").notNull(),
    acceptedAt: ts("accepted_at"),
    createdAt: createdAt(),
  },
  (t) => [index("invitations_ws_idx").on(t.workspaceId)],
);

/** Údaje zpracovatele, razítko a vzhled dokumentu. */
export const processorProfiles = pgTable(
  "processor_profiles",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Výchozí profil"),
    isDefault: boolean("is_default").notNull().default(false),
    data: jsonb("data").notNull(),
    logo: bytea("logo"),
    logoMime: text("logo_mime"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("profiles_ws_idx").on(t.workspaceId)],
);

/* ------------------------------------------------------------------ */
/* Projekty a výpočty                                                 */
/* ------------------------------------------------------------------ */

export const projectStatus = pgEnum("project_status", ["DRAFT", "CALCULATED", "ARCHIVED"]);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    jobNumber: text("job_number"),
    methodologyId: text("methodology_id").notNull(),
    status: projectStatus("status").notNull().default("DRAFT"),
    data: jsonb("data").notNull(),
    version: integer("version").notNull().default(1),
    objectLockedAt: ts("object_locked_at"),
    copiedFromId: text("copied_from_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("projects_ws_idx").on(t.workspaceId, t.deletedAt, t.updatedAt)],
);

export const projectRevisions = pgTable(
  "project_revisions",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("revisions_project_idx").on(t.projectId, t.createdAt)],
);

export const calculationRuns = pgTable(
  "calculation_runs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    methodologyId: text("methodology_id").notNull(),
    coreVersion: text("core_version").notNull(),
    normativeDataHash: text("normative_data_hash").notNull(),
    inputHash: text("input_hash").notNull(),
    input: jsonb("input").notNull(),
    result: jsonb("result").notNull(),
    context: jsonb("context").notNull(),
    verifiedCore: boolean("verified_core").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("runs_project_idx").on(t.projectId, t.createdAt)],
);

export const unlockSource = pgEnum("unlock_source", ["CREDIT", "SUBSCRIPTION", "ADMIN"]);

export const projectUnlocks = pgTable(
  "project_unlocks",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    source: unlockSource("source").notNull(),
    ledgerEntryId: text("ledger_entry_id").unique(),
    subscriptionId: text("subscription_id"),
    userId: text("user_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("unlocks_ws_idx").on(t.workspaceId, t.createdAt)],
);

export const exportFormat = pgEnum("export_format", ["PDF", "DOCX"]);

export const exportLogs = pgTable(
  "export_logs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    calculationRunId: text("calculation_run_id")
      .notNull()
      .references(() => calculationRuns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    format: exportFormat("format").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("exports_project_idx").on(t.projectId)],
);

/* ------------------------------------------------------------------ */
/* Ceník, objednávky, platby, kredity, předplatné                     */
/* ------------------------------------------------------------------ */

export const productType = pgEnum("product_type", ["ONE_TIME", "SUBSCRIPTION"]);

export const products = pgTable("products", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: productType("type").notNull(),
  priceHaler: integer("price_haler").notNull(),
  credits: integer("credits"),
  periodMonths: integer("period_months"),
  unlocksPerPeriod: integer("unlocks_per_period"),
  maxMembers: integer("max_members").notNull().default(1),
  features: jsonb("features").notNull().default(sql`'[]'::jsonb`),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

export const orderStatus = pgEnum("order_status", ["PENDING", "PAID", "CANCELED", "FAILED", "REFUNDED"]);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull().unique(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    productCode: text("product_code").notNull(),
    productSnapshot: jsonb("product_snapshot").notNull(),
    amountHaler: integer("amount_haler").notNull(),
    currency: text("currency").notNull().default("CZK"),
    status: orderStatus("status").notNull().default("PENDING"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    billing: jsonb("billing"),
    createdAt: createdAt(),
    paidAt: ts("paid_at"),
  },
  (t) => [index("orders_ws_idx").on(t.workspaceId, t.createdAt)],
);

export const paymentProvider = pgEnum("payment_provider", ["GOPAY", "MOCK"]);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    provider: paymentProvider("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    parentProviderPaymentId: text("parent_provider_payment_id"),
    state: text("state").notNull(),
    amountHaler: integer("amount_haler").notNull(),
    isRecurrence: boolean("is_recurrence").notNull().default(false),
    fulfilledAt: ts("fulfilled_at"),
    lastStatus: jsonb("last_status"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payments_provider_pid_uq").on(t.provider, t.providerPaymentId),
    index("payments_parent_idx").on(t.parentProviderPaymentId),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: id(),
    provider: paymentProvider("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    parentId: text("parent_id"),
    source: text("source").notNull(),
    stateAfter: text("state_after"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("payment_events_pid_idx").on(t.providerPaymentId)],
);

export const ledgerReason = pgEnum("ledger_reason", ["PURCHASE", "UNLOCK", "REFUND", "ADJUSTMENT"]);

/** Kreditní kniha – zůstatek = součet delta; každý zápis má unikátní klíč idempotence. */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    reason: ledgerReason("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    orderId: text("order_id"),
    paymentId: text("payment_id"),
    projectId: text("project_id"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_ws_idx").on(t.workspaceId, t.createdAt)],
);

export const subscriptionStatus = pgEnum("subscription_status", ["PENDING", "ACTIVE", "CANCELED", "EXPIRED"]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    productCode: text("product_code").notNull(),
    status: subscriptionStatus("status").notNull().default("PENDING"),
    orderId: text("order_id"),
    parentProviderPaymentId: text("parent_provider_payment_id").unique(),
    provider: paymentProvider("provider").notNull(),
    currentPeriodStart: ts("current_period_start"),
    currentPeriodEnd: ts("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: ts("canceled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subs_ws_idx").on(t.workspaceId, t.status)],
);

/* ------------------------------------------------------------------ */
/* Šablony                                                            */
/* ------------------------------------------------------------------ */

export const templateKind = pgEnum("template_kind", ["LINE", "ZONE", "INTERNAL_SYSTEM", "PROJECT"]);

export const templates = pgTable(
  "templates",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: templateKind("kind").notNull(),
    name: text("name").notNull(),
    data: jsonb("data").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("templates_ws_kind_idx").on(t.workspaceId, t.kind)],
);

/* ------------------------------------------------------------------ */
/* Technické tabulky                                                  */
/* ------------------------------------------------------------------ */

export const geoCache = pgTable(
  "geo_cache",
  {
    key: text("key").primaryKey(),
    data: jsonb("data").notNull(),
    createdAt: createdAt(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("geo_cache_expires_idx").on(t.expiresAt)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: ts("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limits_window_idx").on(t.windowStart)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    workspaceId: text("workspace_id"),
    userId: text("user_id"),
    action: text("action").notNull(),
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_ws_idx").on(t.workspaceId, t.createdAt), index("audit_action_idx").on(t.action, t.createdAt)],
);
