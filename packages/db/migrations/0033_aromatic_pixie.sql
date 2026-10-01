CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_id" uuid,
	"step_id" uuid,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assignee_user_id" uuid,
	"due_on" date,
	"position" integer DEFAULT 0 NOT NULL,
	"done_at" timestamp with time zone,
	"done_by_user_id" uuid,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reason" text DEFAULT 'by_hand' NOT NULL,
	"started_on" date NOT NULL,
	"closed_at" timestamp with time zone,
	"exit_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"due_days" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"hue" text DEFAULT 'sky' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"owner_user_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_entry_id_pipeline_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."pipeline_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_step_id_pipeline_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."pipeline_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignee_user_id_app_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_done_by_user_id_app_users_id_fk" FOREIGN KEY ("done_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_steps" ADD CONSTRAINT "pipeline_steps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_steps" ADD CONSTRAINT "pipeline_steps_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_owner_user_id_app_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_up_tenant_idx" ON "follow_ups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "follow_up_person_idx" ON "follow_ups" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "follow_up_entry_idx" ON "follow_ups" USING btree ("tenant_id","entry_id");--> statement-breakpoint
CREATE INDEX "follow_up_queue_idx" ON "follow_ups" USING btree ("tenant_id","assignee_user_id","done_at");--> statement-breakpoint
CREATE INDEX "pipeline_entry_tenant_idx" ON "pipeline_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pipeline_entry_person_idx" ON "pipeline_entries" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "pipeline_entry_pipeline_idx" ON "pipeline_entries" USING btree ("tenant_id","pipeline_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_entry_open_unique" ON "pipeline_entries" USING btree ("tenant_id","pipeline_id","person_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "pipeline_step_tenant_idx" ON "pipeline_steps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pipeline_step_pipeline_idx" ON "pipeline_steps" USING btree ("tenant_id","pipeline_id");--> statement-breakpoint
CREATE INDEX "pipeline_tenant_idx" ON "pipelines" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_key_unique" ON "pipelines" USING btree ("tenant_id","key");