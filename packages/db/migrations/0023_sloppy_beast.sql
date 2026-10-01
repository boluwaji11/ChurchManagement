CREATE TABLE "incident_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"room_id" uuid,
	"occurrence_id" uuid,
	"occurred_on" date NOT NULL,
	"volunteers" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"action" text NOT NULL,
	"guardian_notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"notified_by" uuid,
	"reported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_room_id_checkin_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."checkin_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_occurrence_id_service_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."service_occurrences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_tenant_idx" ON "incident_reports" USING btree ("tenant_id","occurred_on");--> statement-breakpoint
CREATE INDEX "incident_person_idx" ON "incident_reports" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "incident_room_idx" ON "incident_reports" USING btree ("tenant_id","room_id");