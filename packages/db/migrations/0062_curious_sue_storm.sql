ALTER TABLE "form_fields" ADD COLUMN "show_when_field_id" uuid;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "show_when_op" text;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "show_when_value" text;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_show_when_field_id_form_fields_id_fk" FOREIGN KEY ("show_when_field_id") REFERENCES "public"."form_fields"("id") ON DELETE set null ON UPDATE no action;