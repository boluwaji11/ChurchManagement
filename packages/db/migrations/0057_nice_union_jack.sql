ALTER TABLE "contact_methods" ADD COLUMN "invalid_reason" text;--> statement-breakpoint
ALTER TABLE "contact_methods" ADD COLUMN "invalid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "send_recipients" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;