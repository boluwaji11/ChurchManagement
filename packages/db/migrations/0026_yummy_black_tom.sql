CREATE TABLE "group_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"met_on" date NOT NULL,
	"not_held" boolean DEFAULT false NOT NULL,
	"note" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_attendance" ADD CONSTRAINT "group_attendance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_attendance" ADD CONSTRAINT "group_attendance_meeting_id_group_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."group_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_attendance" ADD CONSTRAINT "group_attendance_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meetings" ADD CONSTRAINT "group_meetings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meetings" ADD CONSTRAINT "group_meetings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_attendance_tenant_idx" ON "group_attendance" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "group_attendance_meeting_idx" ON "group_attendance" USING btree ("tenant_id","meeting_id");--> statement-breakpoint
CREATE INDEX "group_attendance_person_idx" ON "group_attendance" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_attendance_unique" ON "group_attendance" USING btree ("meeting_id","person_id");--> statement-breakpoint
CREATE INDEX "group_meeting_tenant_idx" ON "group_meetings" USING btree ("tenant_id","met_on");--> statement-breakpoint
CREATE INDEX "group_meeting_group_idx" ON "group_meetings" USING btree ("tenant_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_unique" ON "group_meetings" USING btree ("group_id","met_on");