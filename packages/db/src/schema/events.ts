import {
  pgTable, uuid, text, integer, boolean, date, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, campuses } from "./tenancy";
import { people } from "./people";
import { forms } from "./forms";
import { hue } from "./enums";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R14.1. Something the church is putting on.
 *
 * A camp, a picnic, a membership class, a men's breakfast. Separate from a
 * service occurrence, which is the weekly rhythm the church already keeps, and
 * separate from a group, which is a set of people who meet on a pattern. An
 * event is a date somebody signs up for.
 *
 * The registration questions are a form (R14.5), which is the same builder,
 * the same conditions and the same person matching a standalone form uses. A
 * form pointed at an event never shows in the Forms list: it belongs to the
 * event's Register section and nowhere else.
 */
export const events = pgTable(
  "events",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** The part of the public link that names this event. */
    slug: text("slug").notNull(),
    /** R14.1. What it is, in the church's own words. Markdown. */
    description: text("description"),
    /** R24.4. The colour it wears on a card, a tile and its public page. */
    hue: hue("hue").notNull().default("amber"),
    /** R14.1. The picture across the top. */
    coverKey: text("cover_key"),

    /** R14.1. When it happens. An event with no end time runs as long as it runs. */
    startsOn: date("starts_on").notNull(),
    startsAt: text("starts_at"),
    endsOn: date("ends_on"),
    endsAt: text("ends_at"),

    /** R14.1. Where, in the church's words, plus an address worth publishing. */
    location: text("location"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),

    /**
     * R14.1. "draft", "published" or "cancelled".
     *
     * A draft has no public page. A cancelled event keeps its page and says so,
     * because the people who registered will go looking for it.
     */
    status: text("status").notNull().default("draft"),
    /** R14.1. Whether anybody without an account can see it. */
    listed: boolean("listed").notNull().default(true),

    /** R14.2, R14.4. Whether it is taking registrations at all. */
    registrationOpen: boolean("registration_open").notNull().default(true),
    /** R14.4. The last day somebody can register. Null means up to the event. */
    registrationClosesOn: date("registration_closes_on"),
    /**
     * R14.4. The time of day it closes, on that last day.
     *
     * Null means the end of the day, which is what a church means by "closes on
     * the 6th". A church that wants noon says noon.
     */
    registrationClosesAt: text("registration_closes_at"),
    /** R14.4. How many places. Null means no limit. */
    capacity: integer("capacity"),
    /** R14.4. Whether a full event takes names for a waiting list. */
    waitlist: boolean("waitlist").notNull().default(false),

    /**
     * R14.5. The questions somebody answers when they register.
     *
     * A form of its own, so everything the form builder does is already here.
     * Null until the church adds questions, which is the common case: most
     * events want a name and a number of places and nothing else.
     */
    formId: uuid("form_id").references(() => forms.id, { onDelete: "set null" }),

    /** R14.1. Who to ask about it. */
    contactPersonId: uuid("contact_person_id").references(() => people.id, { onDelete: "set null" }),

    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("event_tenant_idx").on(t.tenantId),
    index("event_when_idx").on(t.tenantId, t.startsOn),
    uniqueIndex("event_slug_unique").on(t.tenantId, t.slug),
  ],
);

/**
 * R14.2, R14.6. One person's place at an event.
 *
 * A row per person rather than per booking, because the roster, the capacity
 * count and the emergency contact sheet are all about people. A parent
 * registering three children and themselves writes four rows, tied together by
 * `bookingId` so the church can see they arrived as one family (R14.6).
 *
 * `personId` is null while a registration is waiting to be matched to a record,
 * which is the same R4.4 path a form submission takes.
 */
export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: pk(),
    tenantId: tenantId(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    /** R14.6. The others who were registered in the same breath. */
    bookingId: uuid("booking_id").notNull(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    /** What they typed, kept whether or not a record was found. */
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    /** "going", "waiting" or "cancelled". */
    state: text("state").notNull().default("going"),
    /** R14.5. The answers to this event's questions, for this person. */
    submissionId: uuid("submission_id"),
    /** R14.10. When they turned up. */
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    note: text("note"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("event_reg_tenant_idx").on(t.tenantId),
    index("event_reg_event_idx").on(t.tenantId, t.eventId, t.state),
    index("event_reg_booking_idx").on(t.tenantId, t.bookingId),
    index("event_reg_person_idx").on(t.tenantId, t.personId),
  ],
);
