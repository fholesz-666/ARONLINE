ALTER TYPE "public"."payment_provider" ADD VALUE 'BANK';--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"year" integer NOT NULL,
	"seq" integer NOT NULL,
	"order_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"supplier" jsonb NOT NULL,
	"customer" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"total_haler" integer NOT NULL,
	"currency" text DEFAULT 'CZK' NOT NULL,
	"payment_method" text NOT NULL,
	"variable_symbol" text,
	"note" text,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "invoices_number_unique" UNIQUE("number"),
	CONSTRAINT "invoices_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" text DEFAULT 'CARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "variable_symbol" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "consents" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_year_seq_uq" ON "invoices" USING btree ("year","seq");--> statement-breakpoint
CREATE INDEX "invoices_ws_idx" ON "invoices" USING btree ("workspace_id","issued_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_variable_symbol_unique" UNIQUE("variable_symbol");