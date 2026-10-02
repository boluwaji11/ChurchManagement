CREATE TABLE "abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_abilities" (
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"ability_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_abilities_person_id_ability_id_pk" PRIMARY KEY("person_id","ability_id")
);
--> statement-breakpoint
ALTER TABLE "abilities" ADD CONSTRAINT "abilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_abilities" ADD CONSTRAINT "person_abilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_abilities" ADD CONSTRAINT "person_abilities_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_abilities" ADD CONSTRAINT "person_abilities_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abilities_tenant_idx" ON "abilities" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "abilities_name_unique" ON "abilities" USING btree ("tenant_id","kind","name");--> statement-breakpoint
CREATE INDEX "person_abilities_tenant_idx" ON "person_abilities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "person_abilities_ability_idx" ON "person_abilities" USING btree ("tenant_id","ability_id");