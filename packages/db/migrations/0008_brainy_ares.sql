CREATE TABLE "service_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campus_id" uuid,
	"service_time_id" uuid,
	"name" text NOT NULL,
	"occurs_on" date NOT NULL,
	"starts_at" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"note" text,
	"count_adults" integer,
	"count_children" integer,
	"count_visitors" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_occurrences" ADD CONSTRAINT "service_occurrences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_occurrences" ADD CONSTRAINT "service_occurrences_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_occurrences" ADD CONSTRAINT "service_occurrences_service_time_id_service_times_id_fk" FOREIGN KEY ("service_time_id") REFERENCES "public"."service_times"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "occ_tenant_idx" ON "service_occurrences" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "occ_date_idx" ON "service_occurrences" USING btree ("tenant_id","occurs_on");--> statement-breakpoint
CREATE UNIQUE INDEX "occ_unique" ON "service_occurrences" USING btree ("tenant_id","service_time_id","occurs_on");