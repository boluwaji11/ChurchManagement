CREATE TABLE "person_merges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"winner_id" uuid NOT NULL,
	"loser_id" uuid NOT NULL,
	"winner_before" jsonb,
	"moved_rows" jsonb,
	"merged_by_user_id" uuid,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "person_merges" ADD CONSTRAINT "person_merges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_merges" ADD CONSTRAINT "person_merges_winner_id_people_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_merges" ADD CONSTRAINT "person_merges_loser_id_people_id_fk" FOREIGN KEY ("loser_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_merges" ADD CONSTRAINT "person_merges_merged_by_user_id_app_users_id_fk" FOREIGN KEY ("merged_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_merges_tenant_idx" ON "person_merges" USING btree ("tenant_id","merged_at");--> statement-breakpoint
CREATE INDEX "person_merges_loser_idx" ON "person_merges" USING btree ("loser_id");