ALTER TABLE "substitute_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "substitute_requests" CASCADE;--> statement-breakpoint
ALTER TABLE "serving_assignments" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
UPDATE "serving_assignments" SET "status" = 'pending' WHERE "status" = 'asked';
