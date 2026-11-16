ALTER TABLE "vv_protocols" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "vv_protocols" ADD CONSTRAINT "vv_protocols_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vv_protocols_user_idx" ON "vv_protocols" USING btree ("user_id");
