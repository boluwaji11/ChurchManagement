CREATE TABLE "substitute_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"reason" text,
	"status" text DEFAULT 'open' NOT NULL,
	"filled_by_person_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "substitute_requests" ADD CONSTRAINT "substitute_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitute_requests" ADD CONSTRAINT "substitute_requests_assignment_id_serving_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."serving_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitute_requests" ADD CONSTRAINT "substitute_requests_filled_by_person_id_people_id_fk" FOREIGN KEY ("filled_by_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "substitute_tenant_idx" ON "substitute_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "substitute_assignment_idx" ON "substitute_requests" USING btree ("tenant_id","assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "substitute_open_unique" ON "substitute_requests" USING btree ("assignment_id") WHERE "substitute_requests"."status" = 'open';