CREATE TABLE "checkin_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campus_id" uuid,
	"name" text NOT NULL,
	"hue" text DEFAULT 'sky' NOT NULL,
	"min_age_months" integer,
	"max_age_months" integer,
	"capacity" integer,
	"ratio" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin_rooms" ADD CONSTRAINT "checkin_rooms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_rooms" ADD CONSTRAINT "checkin_rooms_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_tenant_idx" ON "checkin_rooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "room_age_idx" ON "checkin_rooms" USING btree ("tenant_id","min_age_months","max_age_months");--> statement-breakpoint
CREATE UNIQUE INDEX "room_name_unique" ON "checkin_rooms" USING btree ("tenant_id","name");