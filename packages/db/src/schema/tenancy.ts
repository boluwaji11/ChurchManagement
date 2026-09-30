import { pgTable, uuid, text, boolean, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
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
    website: text("website"),
    /** R1.1. One of the twelve hues, used wherever the church brands a page. */
    brandHue: hue("brand_hue").notNull().default("indigo"),
    /** R1.1. The storage key, filled by the upload in R1.18. */
    logoKey: text("logo_key"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("tenants_slug_key").on(t.slug)],
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
export const tenantMembers = pgTable(
  "tenant_members",
  {
    id: pk(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    role: tenantRole("role").notNull().default("staff"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("tenant_members_unique").on(t.tenantId, t.userId)],
);
