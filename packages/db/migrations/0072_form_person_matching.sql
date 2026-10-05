-- R4.4. Which part of a person's record a question's answer is.
--
-- A church writes "What's your email?" in its own words, so the label cannot be
-- read for meaning. The builder asks once, here, and every submission after it
-- lands on the right field.
ALTER TABLE "form_fields" ADD COLUMN IF NOT EXISTS "maps_to" text;--> statement-breakpoint

-- R4.4. Who the submission turned out to be, and how sure we were.
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "person_id" uuid
  REFERENCES "people"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "match_state" text
  NOT NULL DEFAULT 'none';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submission_person_idx"
  ON "form_submissions" ("tenant_id", "person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submission_review_idx"
  ON "form_submissions" ("tenant_id", "match_state");
