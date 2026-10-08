import {
  pgTable, uuid, text, boolean, date, timestamp, index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import { tenants, campuses, appUsers } from "./tenancy";
import {
  lifecycleStatus, householdRole, contactKind, contactLabel, relationshipKind,
  milestoneKind, backgroundCheckStatus, hue,
} from "./enums";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/** R2.2. A household, which is how churches actually think about members. */
export const households = pgTable(
  "households",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** R2.13. Archive, never hard delete. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("households_tenant_idx").on(t.tenantId), index("households_name_idx").on(t.tenantId, t.name)],
);

export const members = pgTable(
  "members",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    /** R24.6. The readable part of their address, unique within the church. */
    slug: text("slug").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    /** What members actually call them. Shown in preference to the legal first name. */
    preferredName: text("preferred_name"),
    gender: text("gender"),
    dateOfBirth: date("date_of_birth"),
    maritalStatus: text("marital_status"),
    /**
     * R2.1. What year of school they are in, from pre-K to graduate school.
     *
     * A church asks this to put a child in the right room and a student in the
     * right group, so it is a managed vocabulary rather than free text: a room
     * assignment cannot be made from "6th" and "sixth grade" being two answers.
     * Null for everybody who is not in school, which is most members.
     */
    lifecycleStatus: lifecycleStatus("lifecycle_status").notNull().default("visitor"),
    membershipDate: date("membership_date"),
    firstVisitOn: date("first_visit_on"),
    photoKey: text("photo_key"),
    /**
     * R13.2. The customer Stripe keeps for them on this church's account, so
     * a giver's card is offered back to them rather than typed again. A
     * handle, never anything about the card itself.
     */
    stripeCustomerId: text("stripe_customer_id"),
    /**
     * R8.10. What a volunteer has to know before a child goes into a room, in
     * the fewest words that are true: "Peanuts", "Bee stings". Printed on the
     * child's label and shown full size at check-in.
     */
    allergies: text("allergies"),
    /** R8.10. Anything else a room needs: an inhaler, a seizure plan. */
    medicalNote: text("medical_note"),
    /**
     * R9.3. The account this person signs in with, where they have one.
     *
     * A role says what somebody may do; this says who they are. A group leader
     * cannot be scoped to their own group without it, and neither can anything
     * a member does for themselves in the portal.
     */
    appUserId: uuid("app_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** R2.13. Archived members leave lists and counts, history is retained. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("people_tenant_idx").on(t.tenantId),
    index("people_name_idx").on(t.tenantId, t.lastName, t.firstName),
    index("people_status_idx").on(t.tenantId, t.lifecycleStatus),
    // One person a church for an account, so "who am I here" has one answer.
    uniqueIndex("people_user_unique").on(t.tenantId, t.appUserId),
  ],
);

/** R2.2. One household at a time, with history retained through ended_on. */
export const householdMemberships = pgTable(
  "household_memberships",
  {
    id: pk(),
    tenantId: tenantId(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    role: householdRole("role").notNull().default("other"),
    startedOn: date("started_on"),
    endedOn: date("ended_on"),
    createdAt: created(),
  },
  (t) => [
    index("hm_tenant_idx").on(t.tenantId),
    index("hm_person_idx").on(t.tenantId, t.memberId),
    index("hm_household_idx").on(t.tenantId, t.householdId),
  ],
);

/** R2.3. Multiple per person, one marked primary. */
export const contactMethods = pgTable(
  "contact_methods",
  {
    id: pk(),
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    kind: contactKind("kind").notNull(),
    label: contactLabel("label").notNull().default("mobile"),
    value: text("value").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    /** R16.7. Bounces invalidate an address rather than silently failing forever. */
    isValid: boolean("is_valid").notNull().default(true),
    createdAt: created(),
  },
  (t) => [index("contact_tenant_idx").on(t.tenantId), index("contact_person_idx").on(t.tenantId, t.memberId)],
);

/**
 * R2.3. Addresses attach to a household or a person, never both. The check
 * constraint lives in the security migration.
 */
export const addresses = pgTable(
  "addresses",
  {
    id: pk(),
    tenantId: tenantId(),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    label: contactLabel("label").notNull().default("home"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("US"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: created(),
  },
  (t) => [
    index("addresses_tenant_idx").on(t.tenantId),
    index("addresses_person_idx").on(t.tenantId, t.memberId),
    index("addresses_household_idx").on(t.tenantId, t.householdId),
  ],
);

/**
 * R2.4. Independent of household, because guardianship and custody do not follow
 * household lines. do_not_contact is enforced at directory generation (R3.x) and
 * as a blocking warning at check-in checkout (R8.9).
 */
export const relationships = pgTable(
  "relationships",
  {
    id: pk(),
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    relatedMemberId: uuid("related_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    kind: relationshipKind("kind").notNull(),
    notes: text("notes"),
    createdAt: created(),
  },
  (t) => [
    index("rel_tenant_idx").on(t.tenantId),
    index("rel_person_idx").on(t.tenantId, t.memberId),
    // Who points at this person. R8.8 reads the relationship both ways,
    // because a guardian recorded once is a guardian in both directions.
    index("rel_related_idx").on(t.tenantId, t.relatedMemberId),
    uniqueIndex("rel_unique").on(t.tenantId, t.memberId, t.relatedMemberId, t.kind),
  ],
);

/** R2.6. Dated, with notes. Drives pipelines and reports. */
export const milestones = pgTable(
  "milestones",
  {
    id: pk(),
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    kind: milestoneKind("kind").notNull(),
    occurredOn: date("occurred_on").notNull(),
    notes: text("notes"),
    createdAt: created(),
  },
  (t) => [index("milestones_tenant_idx").on(t.tenantId), index("milestones_person_idx").on(t.tenantId, t.memberId)],
);

/** R2.10. Status tracking only in v1. Gates children's scheduling in R10.9. */
export const backgroundChecks = pgTable(
  "background_checks",
  {
    id: pk(),
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    provider: text("provider"),
    status: backgroundCheckStatus("status").notNull().default("not_started"),
    completedOn: date("completed_on"),
    expiresOn: date("expires_on"),
    createdAt: created(),
  },
  (t) => [index("bgc_tenant_idx").on(t.tenantId), index("bgc_person_idx").on(t.tenantId, t.memberId)],
);

/** R1.13. Tags carry a hue, because a tag nobody can scan is a tag nobody uses. */
export const tags = pgTable(
  "tags",
  {
    id: pk(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    /**
     * R1.13. What the tag is called in an address.
     *
     * The directory filters by tag, and the filter was a raw id, which is what
     * somebody saw when they copied the address to send to a colleague.
     */
    slug: text("slug"),
    hue: hue("hue").notNull().default("teal"),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("tags_unique").on(t.tenantId, t.name),
    uniqueIndex("tags_slug_unique").on(t.tenantId, t.slug),
  ],
);

export const memberTags = pgTable(
  "member_tags",
  {
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.tagId] }),
    index("person_tags_tenant_idx").on(t.tenantId),
    index("person_tags_tag_idx").on(t.tenantId, t.tagId),
  ],
);
