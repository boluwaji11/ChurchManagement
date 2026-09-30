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
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("tenants_slug_key").on(t.slug)],
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
