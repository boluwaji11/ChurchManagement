-- R14.4. The time of day registration closes, beside the date it closes on.
--
-- A camp that closes "on the 6th" usually means the end of the 6th, which is
-- the default when this is empty. A church that wants noon says noon.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "registration_closes_at" text;
