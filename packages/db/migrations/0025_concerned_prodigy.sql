ALTER TABLE "people" ADD COLUMN "app_user_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "people_user_unique" ON "people" USING btree ("tenant_id","app_user_id");