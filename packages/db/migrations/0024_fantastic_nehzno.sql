CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_on" date NOT NULL,
	"left_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hue" text DEFAULT 'sky' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campus_id" uuid,
	"type_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"day_of_week" integer,
	"starts_at" text,
	"frequency" text,
	"location" text,
	"capacity" integer,
	"open_to_join" boolean DEFAULT true NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_types" ADD CONSTRAINT "group_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_type_id_group_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."group_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_member_tenant_idx" ON "group_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "group_member_group_idx" ON "group_memberships" USING btree ("tenant_id","group_id");--> statement-breakpoint
CREATE INDEX "group_member_person_idx" ON "group_memberships" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_member_live_unique" ON "group_memberships" USING btree ("group_id","person_id") WHERE "group_memberships"."left_on" is null;--> statement-breakpoint
CREATE INDEX "group_type_tenant_idx" ON "group_types" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_type_name_unique" ON "group_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "group_tenant_idx" ON "groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "group_type_idx" ON "groups" USING btree ("tenant_id","type_id");--> statement-breakpoint
CREATE INDEX "group_day_idx" ON "groups" USING btree ("tenant_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "group_name_unique" ON "groups" USING btree ("tenant_id","name");