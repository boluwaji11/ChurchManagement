ALTER TABLE "service_times" ADD COLUMN "frequency" text DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_times" ADD COLUMN "anchor_on" date;--> statement-breakpoint
ALTER TABLE "service_times" ADD COLUMN "until_on" date;