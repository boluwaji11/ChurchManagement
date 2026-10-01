CREATE TABLE "directory_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"show_email" boolean DEFAULT false NOT NULL,
	"show_phone" boolean DEFAULT false NOT NULL,
	"show_address" boolean DEFAULT false NOT NULL,
	"show_birthday" boolean DEFAULT false NOT NULL,
	"show_photo" boolean DEFAULT false NOT NULL,
	"show_children" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "directory_preferences" ADD CONSTRAINT "directory_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_preferences" ADD CONSTRAINT "directory_preferences_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "directory_prefs_person_key" ON "directory_preferences" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "directory_prefs_tenant_idx" ON "directory_preferences" USING btree ("tenant_id");