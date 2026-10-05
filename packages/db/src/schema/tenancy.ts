import {
  pgTable, uuid, text, boolean, integer, bigint, date, timestamp, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { hue, tenantRole } from "./enums";

const pk = () => uuid("id").primaryKey().defaultRandom();
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/** The tenant. Every other table carries tenant_id and an RLS policy. */
export const tenants = pgTable(
  "tenants",
  {
    id: pk(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    timezone: text("timezone").notNull().default("America/Chicago"),
    /** R1.1. One address. A church with two buildings has two campuses (R1.2). */
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("US"),
    phone: text("phone"),
    /** R1.1. Where somebody reading a public page writes to. */
    email: text("email"),
    website: text("website"),
    /**
     * R7.6. How many held services somebody misses in a row before the church
     * wants to know. Three by default, which is roughly a month of services.
     */
    absenceThreshold: integer("absence_threshold").notNull().default(3),
    /** R1.1. One of the twelve hues, used wherever the church brands a page. */
    brandHue: hue("brand_hue").notNull().default("indigo"),
    /** R1.1. The key of the logo in the church bucket. */
    logoKey: text("logo_key"),
    /**
     * R19.7. Set only on a demo church, to the moment it stops existing.
     *
     * A demo is a whole church of its own rather than a mode inside a real one,
     * because the only safe place for invented members is somewhere nobody could
     * mistake for their own records.
     */
    demoExpiresAt: timestamp("demo_expires_at", { withTimezone: true }),
    /** When a visitor took this demo church. Null while it waits in the pool. */
    demoClaimedAt: timestamp("demo_claimed_at", { withTimezone: true }),
    /**
     * R1.16. Hard, enforced, visible. Two gibibytes, which is a logo, a few
     * hundred photos and the documents a church of this size actually keeps.
     * Sermon video is a non-goal: link to YouTube.
     */
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" })
      .notNull().default(2147483648),
    /**
     * R22.1. The setup wizard is answered by looking at the church's records,
     * so there is no progress to store. These two are the things no query can
     * find out: that a church has no kids' classes and does not want to be
     * asked again, and that somebody put the whole thing away.
     */
    setupDismissedAt: timestamp("setup_dismissed_at", { withTimezone: true }),
    setupSkipped: text("setup_skipped").array(),
    /**
     * R1.7. The code a church hands its congregation so they can get an account.
     *
     * A code rather than the slug, because a slug is a guess and this is the
     * only thing standing between a stranger and the church's waiting list.
     * Null means joining is switched off. It can be rotated, which makes every
     * printed card stop working, which is the point of rotating it.
     */
    joinCode: text("join_code"),
    /**
     * R8.11. What goes on a child's label.
     *
     * The church's own layout rather than the station's, because a parent who
     * collects from two different doors should be handed the same label, and a
     * tablet swapped out at 9:55 should print what the one before it printed.
     */
    labelShowRoom: boolean("label_show_room").notNull().default(true),
    labelShowAllergies: boolean("label_show_allergies").notNull().default(true),
    labelShowCode: boolean("label_show_code").notNull().default(true),
    labelShowService: boolean("label_show_service").notNull().default(true),
    labelParentTag: boolean("label_parent_tag").notNull().default(true),
    /** One of LABEL_SIZES. The stock the church loads into its printer. */
    labelSize: text("label_size").notNull().default("brother_24x11"),
    /**
     * R1.1, R21.x. When a human looked at this church and said it is a church.
     *
     * Null means provisional, which is where every new church starts. A
     * provisional church works for the person who made it and is capped: a
     * small number of members, no join link, no invitations. A real church is
     * unblocked in an hour, which is what the sixty-minute time-to-value
     * number needs. An abuser gets nothing worth having.
     *
     * Not a queue with a task on somebody. That was built and taken out on the
     * same day, because it put work on a volunteer every time a regular signed
     * up for a door the church had already chosen to open.
     */
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("tenants_slug_key").on(t.slug), uniqueIndex("tenants_join_code_key").on(t.joinCode)],
);

/**
 * R1.1. When the church gathers.
 *
 * A table rather than a text field, because attendance (R7.3), check-in (R8.x)
 * and the service plans in R11 all hang off a specific service on a specific
 * day. A church with an 09:00 and an 11:00 counts them separately, always has,
 * and a free-text "Sundays 9 & 11" cannot be counted.
 */
export const serviceTimes = pgTable(
  "service_times",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** 0 is Sunday, matching JavaScript and Postgres `dow`. */
    dayOfWeek: integer("day_of_week").notNull(),
    /** Local to the church's timezone, as HH:MM. */
    startsAt: text("starts_at").notNull(),
    /**
     * R7.1. "weekly", "fortnightly" or "monthly". Monthly means the same
     * weekday of the month, so a second Tuesday stays a second Tuesday rather
     * than drifting to a date that lands on a Saturday.
     */
    frequency: text("frequency").notNull().default("weekly"),
    /**
     * The first date, which fixes the pattern. Fortnightly counts from it, and
     * monthly takes its place in the month from it.
     */
    anchorOn: date("anchor_on"),
    /** R7.1. When it stops. Null means it carries on. */
    untilOn: date("until_on"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("service_times_tenant_idx").on(t.tenantId)],
);

/**
 * R1.2. Campus and location exist from the first migration even though v1 exposes
 * a single campus. Adding a tenancy dimension later touches every query.
 */
export const campuses = pgTable(
  "campuses",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("campuses_tenant_idx").on(t.tenantId)],
);

export const locations = pgTable(
  "locations",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").notNull().references(() => campuses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: created(),
  },
  (t) => [index("locations_tenant_idx").on(t.tenantId)],
);

/**
 * Rooms own a hue. It prints on the child's check-in label and tints the room
 * card, so a volunteer directs a parent by colour rather than by reading a
 * name. (R8.14, R24.5)
 */
export const rooms = pgTable(
  "rooms",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hue: hue("hue").notNull(),
    minAgeMonths: integer("min_age_months"),
    maxAgeMonths: integer("max_age_months"),
    capacity: integer("capacity"),
    /** R8.16. Configurable per age band. */
    volunteerRatio: integer("volunteer_ratio"),
    createdAt: created(),
  },
  (t) => [index("rooms_tenant_idx").on(t.tenantId)],
);

/**
 * Mirrors the Supabase Auth user. Global, so no tenant_id: a person can belong
 * to more than one church over time. Authorization lives in tenant_members.
 */
export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("app_users_email_key").on(t.email)],
);

/**
 * The membership join. RLS isolates by tenant. Whether a user may set a given
 * tenant as their context is checked in the application layer before the
 * session variable is set. (docs/architecture.md)
 */
/**
 * R1.6. The roles this church has, built-in and its own.
 *
 * A role is a name and a set of permissions. The nine built-ins are written in
 * here for every church so the matrix is one list rather than two, and so a
 * church can see the built-in beside the one it wrote.
 *
 * `builtin` marks the nine. Their permissions are the product's answer and
 * cannot be edited, because a church that quietly removes "run check-in" from
 * Check-in volunteer has broken a service rather than configured one.
 */
export const tenantRoles = pgTable(
  "tenant_roles",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** The built-in's own name, such as "staff", or a slug for a custom role. */
    key: text("key").notNull(),
    name: text("name").notNull(),
    /** Permission keys from packages/db/src/permissions.ts. */
    permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
    builtin: boolean("builtin").notNull().default(false),
    /**
     * R1.6. Whether this church has changed a built-in from what ConnectApp ships.
     *
     * An untouched built-in keeps following the product, so a permission we add
     * later reaches a church that has been running for a year. One a church has
     * edited is theirs, and we stop writing to it.
     */
    customised: boolean("customised").notNull().default(false),
    position: integer("position").notNull().default(0),
    /** R1.6. Archived, never deleted: somebody held this role, and the log says so. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    index("tenant_roles_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_roles_key_unique").on(t.tenantId, t.key),
  ],
);

export const tenantMembers = pgTable(
  "tenant_members",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    /**
     * R1.4. The built-in role. Kept alongside role_id because it is what the
     * audit log records and what a path that has not been handed the permission
     * set falls back to. A member on a custom role holds "member" here, so
     * anything reading this column alone fails closed.
     */
    role: tenantRole("role").notNull().default("staff"),
    /** R1.6. The role this member actually holds, built-in or custom. */
    roleId: uuid("role_id").references(() => tenantRoles.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [uniqueIndex("tenant_members_unique").on(t.tenantId, t.userId)],
);

/**
 * R1.16. Every object this church has stored, and how big it is.
 *
 * A ledger of our own rather than asking the storage service, because the quota
 * has to be checked before an upload rather than found out afterwards, and
 * because a row here is what makes an orphaned object visible. The object store
 * holds the bytes; this table is the record that they exist.
 */
export const storedFiles = pgTable(
  "stored_files",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull().default("church"),
    /** The path inside the bucket, which begins with the church's slug. */
    key: text("key").notNull(),
    /** What it is for: "logo", "person_photo". Drives where it may be shown. */
    purpose: text("purpose").notNull(),
    contentType: text("content_type").notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [
    index("stored_files_tenant_idx").on(t.tenantId),
    uniqueIndex("stored_files_key").on(t.bucket, t.key),
  ],
);

/**
 * R19.7. What the demo data set put here, so removing it is exact.
 *
 * A church exploring the product should be able to fill it, look around and
 * empty it again without wondering what was theirs. Recording the ids is the
 * only way to answer that without guessing from names or dates.
 */
export const demoRecords = pgTable(
  "demo_records",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** "person", "household" or "tag". */
    entity: text("entity").notNull(),
    recordId: uuid("record_id").notNull(),
    createdAt: created(),
  },
  (t) => [
    index("demo_records_tenant_idx").on(t.tenantId),
    uniqueIndex("demo_records_unique").on(t.tenantId, t.entity, t.recordId),
  ],
);
