ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "ends_on" date;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "address_line1" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "address_line2" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "region" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "postal_code" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "country" text;--> statement-breakpoint
-- Whatever a church typed as one line becomes the street, which is the most
-- that can be read out of it honestly.
UPDATE "groups" SET "address_line1" = "address"
 WHERE "address" IS NOT NULL AND "address_line1" IS NULL;--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN IF EXISTS "address";
