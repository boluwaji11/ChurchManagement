CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"source" text DEFAULT 'roster' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_occurrence_id_service_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."service_occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "att_tenant_idx" ON "attendance_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "att_occurrence_idx" ON "attendance_records" USING btree ("tenant_id","occurrence_id");--> statement-breakpoint
CREATE INDEX "att_person_idx" ON "attendance_records" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "att_unique" ON "attendance_records" USING btree ("occurrence_id","person_id");