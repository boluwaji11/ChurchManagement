CREATE TABLE "checkin_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"reason_kind" text NOT NULL,
	"reason" text NOT NULL,
	"authorised_by" uuid,
	"collected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin_overrides" ADD CONSTRAINT "checkin_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_overrides" ADD CONSTRAINT "checkin_overrides_visit_id_checkin_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."checkin_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_overrides" ADD CONSTRAINT "checkin_overrides_collected_by_people_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "override_tenant_idx" ON "checkin_overrides" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "override_visit_idx" ON "checkin_overrides" USING btree ("tenant_id","visit_id");