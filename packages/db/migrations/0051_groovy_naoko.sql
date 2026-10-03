CREATE TABLE "plan_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"title" text NOT NULL,
	"minutes" integer DEFAULT 5 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_template_items" ADD CONSTRAINT "plan_template_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_template_items" ADD CONSTRAINT "plan_template_items_template_id_plan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."plan_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_template_item_tenant_idx" ON "plan_template_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "plan_template_item_idx" ON "plan_template_items" USING btree ("tenant_id","template_id","position");--> statement-breakpoint
CREATE INDEX "plan_template_tenant_idx" ON "plan_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_template_name_unique" ON "plan_templates" USING btree ("tenant_id","name");