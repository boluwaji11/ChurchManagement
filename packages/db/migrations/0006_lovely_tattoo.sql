CREATE TABLE "demo_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"record_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demo_records" ADD CONSTRAINT "demo_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_records_tenant_idx" ON "demo_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_records_unique" ON "demo_records" USING btree ("tenant_id","entity","record_id");