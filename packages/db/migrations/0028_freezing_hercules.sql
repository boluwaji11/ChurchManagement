ALTER TABLE "groups" ADD COLUMN "ends_at" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "for_whom" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "children_welcome" boolean DEFAULT false NOT NULL;