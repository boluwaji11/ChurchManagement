CREATE TABLE "service_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campus_id" uuid,
	"name" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"starts_at" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "brand_hue" "hue" DEFAULT 'indigo' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "service_times" ADD CONSTRAINT "service_times_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_times" ADD CONSTRAINT "service_times_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_times_tenant_idx" ON "service_times" USING btree ("tenant_id");