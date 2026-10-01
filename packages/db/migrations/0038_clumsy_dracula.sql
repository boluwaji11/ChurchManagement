ALTER TABLE "import_batches" ADD COLUMN "kind" text DEFAULT 'people' NOT NULL;--> statement-breakpoint
ALTER TABLE "import_rows" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "import_rows" ADD COLUMN "group_created" boolean DEFAULT false NOT NULL;