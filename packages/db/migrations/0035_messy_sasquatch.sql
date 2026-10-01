ALTER TABLE "tenants" ADD COLUMN "setup_dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "setup_skipped" text[];