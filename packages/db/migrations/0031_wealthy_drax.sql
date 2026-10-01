CREATE TABLE "email_senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"secret" text,
	"host" text,
	"port" integer,
	"username" text,
	"verified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_senders_tenant_key" ON "email_senders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "email_senders_tenant_idx" ON "email_senders" USING btree ("tenant_id");