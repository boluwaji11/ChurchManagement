CREATE TABLE "stored_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bucket" text DEFAULT 'church' NOT NULL,
	"key" text NOT NULL,
	"purpose" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" bigint NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "storage_quota_bytes" bigint DEFAULT 2147483648 NOT NULL;--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_user_id_app_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stored_files_tenant_idx" ON "stored_files" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stored_files_key" ON "stored_files" USING btree ("bucket","key");