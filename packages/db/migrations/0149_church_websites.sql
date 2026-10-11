CREATE TABLE IF NOT EXISTS "church_websites" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "published" boolean DEFAULT false NOT NULL,
  "layout" text DEFAULT 'gathering' NOT NULL,
  "sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "church_websites_layout_check"
    CHECK ("layout" IN ('gathering', 'community', 'classic'))
);
