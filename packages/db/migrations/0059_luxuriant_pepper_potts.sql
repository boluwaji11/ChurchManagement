ALTER TABLE "tenants" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "approved_by" text;--> statement-breakpoint
-- R1.1. Every church that already existed has been looked at: it was in use
-- before this column existed. Only churches made from here on start provisional.
UPDATE "tenants" SET "approved_at" = now(), "approved_by" = 'existing before approval existed' WHERE "approved_at" IS NULL;
