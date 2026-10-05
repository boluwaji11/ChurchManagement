-- R14.4. Whether the public page says how many places are left.
--
-- A church running a camp with eighty places often wants that read, because it
-- moves people. A church running a membership class for twenty usually does
-- not, because "16 places left" on a class is a room half empty.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "show_capacity" boolean NOT NULL DEFAULT true;
