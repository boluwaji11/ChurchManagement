ALTER TABLE "checkin_visits" ADD COLUMN "kind" text DEFAULT 'child' NOT NULL;--> statement-breakpoint
UPDATE "checkin_visits" SET "kind" = 'adult' WHERE "code" IS NULL;
