CREATE TABLE "checkin_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"room_id" uuid,
	"station_id" uuid,
	"code" text,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_by" uuid,
	"checked_out_at" timestamp with time zone,
	"checked_out_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin_visits" ADD CONSTRAINT "checkin_visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_visits" ADD CONSTRAINT "checkin_visits_occurrence_id_service_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."service_occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_visits" ADD CONSTRAINT "checkin_visits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_visits" ADD CONSTRAINT "checkin_visits_room_id_checkin_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."checkin_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_visits" ADD CONSTRAINT "checkin_visits_station_id_checkin_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."checkin_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_visits" ADD CONSTRAINT "checkin_visits_checked_out_to_people_id_fk" FOREIGN KEY ("checked_out_to") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_tenant_idx" ON "checkin_visits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "visit_occurrence_idx" ON "checkin_visits" USING btree ("tenant_id","occurrence_id");--> statement-breakpoint
CREATE INDEX "visit_person_idx" ON "checkin_visits" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visit_unique" ON "checkin_visits" USING btree ("occurrence_id","person_id");