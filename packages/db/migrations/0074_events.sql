-- R14.1. Something the church is putting on, and who has a place at it.
CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "campus_id" uuid REFERENCES "campuses"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "hue" "hue" DEFAULT 'amber' NOT NULL,
  "cover_key" text,
  "starts_on" date NOT NULL,
  "starts_at" text,
  "ends_on" date,
  "ends_at" text,
  "location" text,
  "address_line1" text,
  "address_line2" text,
  "city" text,
  "region" text,
  "postal_code" text,
  "country" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "listed" boolean DEFAULT true NOT NULL,
  "registration_open" boolean DEFAULT true NOT NULL,
  "registration_closes_on" date,
  "capacity" integer,
  "waitlist" boolean DEFAULT false NOT NULL,
  "form_id" uuid REFERENCES "forms"("id") ON DELETE SET NULL,
  "contact_person_id" uuid REFERENCES "people"("id") ON DELETE SET NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_tenant_idx" ON "events" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_when_idx" ON "events" ("tenant_id", "starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_slug_unique" ON "events" ("tenant_id", "slug");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "event_registrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "booking_id" uuid NOT NULL,
  "person_id" uuid REFERENCES "people"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "state" text DEFAULT 'going' NOT NULL,
  "submission_id" uuid,
  "arrived_at" timestamp with time zone,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_reg_tenant_idx" ON "event_registrations" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_reg_event_idx" ON "event_registrations" ("tenant_id", "event_id", "state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_reg_booking_idx" ON "event_registrations" ("tenant_id", "booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_reg_person_idx" ON "event_registrations" ("tenant_id", "person_id");--> statement-breakpoint

-- R14.5. The event whose registration questions a form holds, where it has one.
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "event_id" uuid;
