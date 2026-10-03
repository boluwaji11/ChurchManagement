DROP TABLE "email_sends" CASCADE;--> statement-breakpoint
DROP TABLE "message_templates" CASCADE;--> statement-breakpoint
DROP TABLE "provider_credentials" CASCADE;--> statement-breakpoint
DROP TABLE "send_recipients" CASCADE;--> statement-breakpoint
DROP TABLE "sends" CASCADE;--> statement-breakpoint
ALTER TABLE "contact_methods" DROP COLUMN "invalid_reason";--> statement-breakpoint
ALTER TABLE "contact_methods" DROP COLUMN "invalid_at";