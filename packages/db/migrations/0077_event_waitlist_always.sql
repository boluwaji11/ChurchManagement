-- R14.4. A full event always takes names.
--
-- It was a choice the church made per event, and one answer is almost always
-- right: a church whose camp fills wants to know who else wanted a place, so it
-- can run another one or ring round when somebody drops out. Turning people
-- away without a trace is the worse outcome, and it was the default nobody
-- changed.
UPDATE "events" SET "waitlist" = true WHERE "waitlist" = false;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "waitlist" SET DEFAULT true;
