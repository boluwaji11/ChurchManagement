CREATE TABLE "plan_item_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"body" text NOT NULL,
	"team_id" uuid,
	"position_id" uuid,
	"person_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_item_notes" ADD CONSTRAINT "plan_item_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_item_notes" ADD CONSTRAINT "plan_item_notes_item_id_plan_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_item_notes" ADD CONSTRAINT "plan_item_notes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_item_notes" ADD CONSTRAINT "plan_item_notes_position_id_team_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."team_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_item_notes" ADD CONSTRAINT "plan_item_notes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_note_tenant_idx" ON "plan_item_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "plan_note_item_idx" ON "plan_item_notes" USING btree ("tenant_id","item_id");