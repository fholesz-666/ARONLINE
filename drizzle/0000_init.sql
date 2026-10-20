CREATE TYPE "public"."email_token_type" AS ENUM('VERIFY_EMAIL', 'RESET_PASSWORD');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('PDF', 'DOCX');--> statement-breakpoint
CREATE TYPE "public"."ledger_reason" AS ENUM('PURCHASE', 'UNLOCK', 'REFUND', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'CANCELED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('GOPAY', 'MOCK');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('ONE_TIME', 'SUBSCRIPTION');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('DRAFT', 'CALCULATED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."template_kind" AS ENUM('LINE', 'ZONE', 'INTERNAL_SYSTEM', 'PROJECT');--> statement-breakpoint
CREATE TYPE "public"."unlock_source" AS ENUM('CREDIT', 'SUBSCRIPTION', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('PERSONAL', 'COMPANY');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"methodology_id" text NOT NULL,
	"core_version" text NOT NULL,
	"normative_data_hash" text NOT NULL,
	"input_hash" text NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"context" jsonb NOT NULL,
	"verified_core" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "ledger_reason" NOT NULL,
	"idempotency_key" text NOT NULL,
	"order_id" text,
	"payment_id" text,
	"project_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "email_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "export_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"calculation_run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"format" "export_format" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" DEFAULT 'MEMBER' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"role" "member_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"product_code" text NOT NULL,
	"product_snapshot" jsonb NOT NULL,
	"amount_haler" integer NOT NULL,
	"currency" text DEFAULT 'CZK' NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"project_id" text,
	"billing" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text NOT NULL,
	"parent_id" text,
	"source" text NOT NULL,
	"state_after" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text NOT NULL,
	"parent_provider_payment_id" text,
	"state" text NOT NULL,
	"amount_haler" integer NOT NULL,
	"is_recurrence" boolean DEFAULT false NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"last_status" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processor_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"label" text DEFAULT 'Výchozí profil' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"data" jsonb NOT NULL,
	"logo" "bytea",
	"logo_mime" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" "product_type" NOT NULL,
	"price_haler" integer NOT NULL,
	"credits" integer,
	"period_months" integer,
	"unlocks_per_period" integer,
	"max_members" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_unlocks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"source" "unlock_source" NOT NULL,
	"ledger_entry_id" text,
	"subscription_id" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_unlocks_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "project_unlocks_ledger_entry_id_unique" UNIQUE("ledger_entry_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"name" text NOT NULL,
	"job_number" text,
	"methodology_id" text NOT NULL,
	"status" "project_status" DEFAULT 'DRAFT' NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"object_locked_at" timestamp with time zone,
	"copied_from_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"product_code" text NOT NULL,
	"status" "subscription_status" DEFAULT 'PENDING' NOT NULL,
	"order_id" text,
	"parent_provider_payment_id" text,
	"provider" "payment_provider" NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_parent_provider_payment_id_unique" UNIQUE("parent_provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" "template_kind" NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"terms_version" text,
	"terms_accepted_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "workspace_type" DEFAULT 'PERSONAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_calculation_run_id_calculation_runs_id_fk" FOREIGN KEY ("calculation_run_id") REFERENCES "public"."calculation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processor_profiles" ADD CONSTRAINT "processor_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_revisions" ADD CONSTRAINT "project_revisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_revisions" ADD CONSTRAINT "project_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_unlocks" ADD CONSTRAINT "project_unlocks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_unlocks" ADD CONSTRAINT "project_unlocks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_ws_idx" ON "audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "runs_project_idx" ON "calculation_runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_ws_idx" ON "credit_ledger" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "email_tokens_user_type_idx" ON "email_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "exports_project_idx" ON "export_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "geo_cache_expires_idx" ON "geo_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitations_ws_idx" ON "invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_ws_uq" ON "memberships" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "memberships_ws_idx" ON "memberships" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "orders_ws_idx" ON "orders" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_events_pid_idx" ON "payment_events" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_pid_uq" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_parent_idx" ON "payments" USING btree ("parent_provider_payment_id");--> statement-breakpoint
CREATE INDEX "profiles_ws_idx" ON "processor_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "revisions_project_idx" ON "project_revisions" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "unlocks_ws_idx" ON "project_unlocks" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_ws_idx" ON "projects" USING btree ("workspace_id","deleted_at","updated_at");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "subs_ws_idx" ON "subscriptions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "templates_ws_kind_idx" ON "templates" USING btree ("workspace_id","kind");