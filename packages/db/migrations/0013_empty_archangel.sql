CREATE TABLE "checkin_station_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"room_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin_station_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"service_time_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campus_id" uuid,
	"name" text NOT NULL,
	"mode" text DEFAULT 'manned' NOT NULL,
	"printer" text DEFAULT 'paper' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin_station_rooms" ADD CONSTRAINT "checkin_station_rooms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_station_rooms" ADD CONSTRAINT "checkin_station_rooms_station_id_checkin_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."checkin_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_station_rooms" ADD CONSTRAINT "checkin_station_rooms_room_id_checkin_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."checkin_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_station_services" ADD CONSTRAINT "checkin_station_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_station_services" ADD CONSTRAINT "checkin_station_services_station_id_checkin_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."checkin_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_station_services" ADD CONSTRAINT "checkin_station_services_service_time_id_service_times_id_fk" FOREIGN KEY ("service_time_id") REFERENCES "public"."service_times"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_stations" ADD CONSTRAINT "checkin_stations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_stations" ADD CONSTRAINT "checkin_stations_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "station_room_tenant_idx" ON "checkin_station_rooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "station_room_unique" ON "checkin_station_rooms" USING btree ("station_id","room_id");--> statement-breakpoint
CREATE INDEX "station_service_tenant_idx" ON "checkin_station_services" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "station_service_unique" ON "checkin_station_services" USING btree ("station_id","service_time_id");--> statement-breakpoint
CREATE INDEX "station_tenant_idx" ON "checkin_stations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "station_name_unique" ON "checkin_stations" USING btree ("tenant_id","name");