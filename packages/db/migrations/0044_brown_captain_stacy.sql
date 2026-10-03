CREATE TABLE "blockout_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serving_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"status" text DEFAULT 'asked' NOT NULL,
	"decline_reason" text,
	"responded_at" timestamp with time zone,
	"overridden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serving_preferences" (
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"frequency" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "serving_preferences_person_id_pk" PRIMARY KEY("person_id")
);
--> statement-breakpoint
ALTER TABLE "blockout_dates" ADD CONSTRAINT "blockout_dates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blockout_dates" ADD CONSTRAINT "blockout_dates_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_assignments" ADD CONSTRAINT "serving_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_assignments" ADD CONSTRAINT "serving_assignments_occurrence_id_service_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."service_occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_assignments" ADD CONSTRAINT "serving_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_assignments" ADD CONSTRAINT "serving_assignments_position_id_team_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."team_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_assignments" ADD CONSTRAINT "serving_assignments_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_preferences" ADD CONSTRAINT "serving_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serving_preferences" ADD CONSTRAINT "serving_preferences_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blockout_tenant_idx" ON "blockout_dates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "blockout_person_idx" ON "blockout_dates" USING btree ("tenant_id","person_id","starts_on");--> statement-breakpoint
CREATE INDEX "assignment_tenant_idx" ON "serving_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "assignment_occurrence_idx" ON "serving_assignments" USING btree ("tenant_id","occurrence_id");--> statement-breakpoint
CREATE INDEX "assignment_person_idx" ON "serving_assignments" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "assignment_team_idx" ON "serving_assignments" USING btree ("tenant_id","team_id","occurrence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_unique" ON "serving_assignments" USING btree ("occurrence_id","position_id","person_id");--> statement-breakpoint
CREATE INDEX "serving_pref_tenant_idx" ON "serving_preferences" USING btree ("tenant_id");