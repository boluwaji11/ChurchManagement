CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"help" text,
	"required" boolean DEFAULT false NOT NULL,
	"options" text[],
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"intro" text,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submission_limit" integer,
	"thanks" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_field_tenant_idx" ON "form_fields" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_field_form_idx" ON "form_fields" USING btree ("tenant_id","form_id","position");--> statement-breakpoint
CREATE INDEX "form_tenant_idx" ON "forms" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "form_slug_unique" ON "forms" USING btree ("tenant_id","slug");