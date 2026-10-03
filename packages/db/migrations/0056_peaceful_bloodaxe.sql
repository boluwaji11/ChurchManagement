CREATE TABLE "send_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"send_id" uuid NOT NULL,
	"person_id" uuid,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"audience_kind" text NOT NULL,
	"audience_id" uuid,
	"audience_name" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"send_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "send_recipients" ADD CONSTRAINT "send_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_recipients" ADD CONSTRAINT "send_recipients_send_id_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."sends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sends" ADD CONSTRAINT "sends_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "send_recipient_tenant_idx" ON "send_recipients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "send_recipient_send_idx" ON "send_recipients" USING btree ("send_id","status");--> statement-breakpoint
CREATE INDEX "send_tenant_idx" ON "sends" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "send_due_idx" ON "sends" USING btree ("status","send_at");