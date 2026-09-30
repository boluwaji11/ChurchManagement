import { pgEnum } from "drizzle-orm/pg-core";

/** Roles from PRD R1.4. Scoped roles see only their own group or team. */
export const tenantRole = pgEnum("tenant_role", [
  "owner", "admin", "staff", "finance", "pastoral",
  "group_leader", "team_leader", "checkin_volunteer", "member",
]);

/** R2.5. Status changes are logged with date and actor. Archived, never deleted. */
export const lifecycleStatus = pgEnum("lifecycle_status", [
  "visitor", "regular_attender", "member", "inactive", "deceased", "archived",
]);

export const householdRole = pgEnum("household_role", ["head", "spouse", "child", "other"]);

export const contactKind = pgEnum("contact_kind", ["email", "phone"]);
export const contactLabel = pgEnum("contact_label", ["home", "mobile", "work", "other"]);

/**
 * R2.4. Independent of household, because guardianship and custody do not follow
 * household lines. do_not_contact exists for custody and safeguarding situations
 * and is enforced at directory generation and at check-in checkout.
 */
export const relationshipKind = pgEnum("relationship_kind", [
  "spouse", "parent", "child", "guardian", "emergency_contact", "do_not_contact",
]);

/** R2.6. Extensible list. */
export const milestoneKind = pgEnum("milestone_kind", [
  "first_visit", "salvation", "baptism", "confirmation", "child_dedication",
  "membership_class", "marriage", "death",
]);

/**
 * R2.7. The distinction is enforced, not advisory. Confidential bodies are
 * encrypted at the application layer and every read is audited.
 */
export const noteClassification = pgEnum("note_classification", ["general", "confidential"]);

/** R2.10. Status tracking only in v1. Gates scheduling in R10.9. */
export const backgroundCheckStatus = pgEnum("background_check_status", [
  "not_started", "pending", "clear", "flagged", "expired",
]);

export const customFieldType = pgEnum("custom_field_type", [
  "text", "number", "date", "select", "multi_select", "boolean", "file",
]);

export const customFieldEntity = pgEnum("custom_field_entity", [
  "person", "household", "group", "event", "donation",
]);

/** The twelve-hue spectrum from the design system. Colour as data (R24.4). */
export const hue = pgEnum("hue", [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
]);

export const auditAction = pgEnum("audit_action", ["insert", "update", "delete", "read"]);
