ALTER TABLE "checkin_stations" ALTER COLUMN "mode" SET DEFAULT 'desk';--> statement-breakpoint
UPDATE "checkin_stations" SET "mode" = 'desk' WHERE "mode" IN ('manned', 'roaming');--> statement-breakpoint
UPDATE "checkin_stations" SET "mode" = 'kiosk' WHERE "mode" = 'phone';
