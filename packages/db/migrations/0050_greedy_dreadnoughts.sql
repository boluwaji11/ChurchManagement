CREATE TABLE "plan_item_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"label" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_item_files" ADD CONSTRAINT "plan_item_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_item_files" ADD CONSTRAINT "plan_item_files_item_id_plan_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_item_files" ADD CONSTRAINT "plan_item_files_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."stored_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_file_tenant_idx" ON "plan_item_files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "plan_file_item_idx" ON "plan_item_files" USING btree ("tenant_id","item_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_file_unique" ON "plan_item_files" USING btree ("item_id","file_id");