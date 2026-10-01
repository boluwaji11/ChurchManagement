CREATE TABLE "checkin_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"code" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin_offline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"happened_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin_codes" ADD CONSTRAINT "checkin_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_codes" ADD CONSTRAINT "checkin_codes_occurrence_id_service_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."service_occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_codes" ADD CONSTRAINT "checkin_codes_station_id_checkin_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."checkin_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_offline_events" ADD CONSTRAINT "checkin_offline_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_offline_events" ADD CONSTRAINT "checkin_offline_events_station_id_checkin_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."checkin_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_tenant_idx" ON "checkin_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "code_block_idx" ON "checkin_codes" USING btree ("tenant_id","station_id","occurrence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "code_unique" ON "checkin_codes" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "offline_event_tenant_idx" ON "checkin_offline_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "offline_event_station_idx" ON "checkin_offline_events" USING btree ("tenant_id","station_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offline_event_unique" ON "checkin_offline_events" USING btree ("tenant_id","event_id");