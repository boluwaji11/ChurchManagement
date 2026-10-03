CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"to_email" text NOT NULL,
	"via" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_send_tenant_idx" ON "email_sends" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "email_send_via_idx" ON "email_sends" USING btree ("tenant_id","via","created_at");