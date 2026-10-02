CREATE TABLE "team_member_positions" (
	"tenant_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_positions_member_id_position_id_pk" PRIMARY KEY("member_id","position_id")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_on" date NOT NULL,
	"left_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"with_children" boolean DEFAULT false NOT NULL,
	"requires_check" boolean DEFAULT false NOT NULL,
	"needed" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campus_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"hue" "hue" DEFAULT 'teal' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_member_positions" ADD CONSTRAINT "team_member_positions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_positions" ADD CONSTRAINT "team_member_positions_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_positions" ADD CONSTRAINT "team_member_positions_position_id_team_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."team_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_positions" ADD CONSTRAINT "team_positions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_positions" ADD CONSTRAINT "team_positions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tmp_tenant_idx" ON "team_member_positions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tmp_position_idx" ON "team_member_positions" USING btree ("tenant_id","position_id");--> statement-breakpoint
CREATE INDEX "team_member_tenant_idx" ON "team_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "team_member_team_idx" ON "team_members" USING btree ("tenant_id","team_id");--> statement-breakpoint
CREATE INDEX "team_member_person_idx" ON "team_members" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_live_unique" ON "team_members" USING btree ("team_id","person_id") WHERE "team_members"."left_on" is null;--> statement-breakpoint
CREATE INDEX "team_position_tenant_idx" ON "team_positions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "team_position_team_idx" ON "team_positions" USING btree ("tenant_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_position_name_unique" ON "team_positions" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "team_tenant_idx" ON "teams" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_name_unique" ON "teams" USING btree ("tenant_id","name");