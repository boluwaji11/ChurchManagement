CREATE INDEX "addresses_person_idx" ON "addresses" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "addresses_household_idx" ON "addresses" USING btree ("tenant_id","household_id");--> statement-breakpoint
CREATE INDEX "person_tags_tag_idx" ON "person_tags" USING btree ("tenant_id","tag_id");--> statement-breakpoint
CREATE INDEX "rel_related_idx" ON "relationships" USING btree ("tenant_id","related_person_id");--> statement-breakpoint
CREATE INDEX "visit_room_idx" ON "checkin_visits" USING btree ("tenant_id","room_id");