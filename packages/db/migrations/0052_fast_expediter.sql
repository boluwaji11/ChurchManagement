ALTER TABLE "service_plans" ADD COLUMN "live_item_id" uuid;--> statement-breakpoint
ALTER TABLE "service_plans" ADD COLUMN "live_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_plans" ADD COLUMN "live_item_at" timestamp with time zone;