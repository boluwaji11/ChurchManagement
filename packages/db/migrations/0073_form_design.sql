-- R4.1, R24.4. A form a church is glad to link to.
--
-- The hue is the same twelve the rest of the product assigns to things, so a
-- form takes a colour the way a group type or a room does. The cover is the
-- picture across the top, and a form with none wears its hue flat, which is the
-- rule the group finder already follows.
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "hue" "hue" NOT NULL DEFAULT 'indigo';--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "cover_key" text;
