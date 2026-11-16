CREATE TABLE "vv_protocols" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"data" jsonb NOT NULL,
	"email" text NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"confirmations" jsonb NOT NULL,
	"logo" "bytea",
	"logo_mime" text,
	"premium_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vv_protocols_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vv_protocol_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vv_protocol_id_vv_protocols_id_fk" FOREIGN KEY ("vv_protocol_id") REFERENCES "public"."vv_protocols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vv_protocols_created_idx" ON "vv_protocols" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vv_protocols_email_idx" ON "vv_protocols" USING btree ("email");
