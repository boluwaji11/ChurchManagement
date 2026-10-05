import { type AnyPgColumn } from "drizzle-orm/pg-core";
import {
  pgTable, uuid, text, boolean, integer, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { hue } from "./enums";
import { people } from "./people";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R4.1. A form a church builds and puts in front of people.
 *
 * A connection card, a prayer request, a volunteer application. The whole value
 * is R4.4, where a submission becomes a person record or attaches to one, so a
 * form is a way of getting data in without anybody typing it twice.
 *
 * Closed rather than deleted, because a form with answers in it is a record of
 * what people were asked. Deleting one would delete the question that explains
 * every answer under it.
 */
export const forms = pgTable(
  "forms",
  {
    id: pk(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    /** The words at the top of the form, in the church's own voice. Markdown. */
    intro: text("intro"),
    /**
     * R24.4. The form's colour, from the same twelve the rest of the product
     * assigns to things. It paints the cover and the heading band.
     */
    hue: hue("hue").notNull().default("indigo"),
    /** R4.1. The picture across the top, where a church uploaded one. */
    coverKey: text("cover_key"),
    /** The part of the public link that names this form. */
    slug: text("slug").notNull(),
    /**
     * R14.5. The event whose registration questions these are, or null.
     *
     * A form with an event belongs to that event's Register section and never
     * shows in the Forms list, which keeps that list the standalone forms a
     * church actually goes looking for.
     *
     * No foreign key, because the event points at the form as well and two
     * references in a circle make either row impossible to insert first. The
     * event's reference is the one that cascades.
     */
    eventId: uuid("event_id"),
    /** "draft", "open" or "closed". A draft has no public link. */
    status: text("status").notNull().default("draft"),
    /**
     * R4.9. How many submissions this form takes before it closes itself.
     *
     * Null means no limit. A church running a sign-up for twelve places sets
     * twelve, and the form closes rather than a volunteer having to watch it.
     */
    submissionLimit: integer("submission_limit"),
    /** What somebody reads after sending it, in the church's own words. */
    thanks: text("thanks"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("form_tenant_idx").on(t.tenantId),
    uniqueIndex("form_slug_unique").on(t.tenantId, t.slug),
  ],
);

/**
 * R4.1. One question on a form, or a heading between questions.
 *
 * A section is a field with no answer, which keeps the order in one list. A
 * builder that holds sections and questions in two places is a builder where
 * dragging a question between sections is a special case.
 */
export const formFields = pgTable(
  "form_fields",
  {
    id: pk(),
    tenantId: tenantId(),
    formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
    /**
     * "text", "long_text", "email", "phone", "number", "date", "select",
     * "multi_select", "checkbox", "file" or "section".
     */
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    /** The church's own clarifier under the question. Theirs to write. */
    help: text("help"),
    required: boolean("required").notNull().default(false),
    /** The choices, for a select or a multi-select. */
    options: text("options").array(),
    position: integer("position").notNull().default(0),
    /**
     * R4.2. The earlier question this one waits on, when it waits on one.
     *
     * A church asking "are you new here?" wants the three follow-up questions
     * to appear for the people who say yes and stay out of everybody else's
     * way. One condition per question is the whole feature: a builder with and
     * and or in it is a builder Maria closes.
     *
     * Cleared rather than orphaned when the earlier question goes, so a
     * condition always points at a question that exists.
     */
    showWhenFieldId: uuid("show_when_field_id").references(
      (): AnyPgColumn => formFields.id,
      { onDelete: "set null" },
    ),
    /** "is", "is_not", "answered" or "blank". */
    showWhenOp: text("show_when_op"),
    /** The answer being matched, for "is" and "is_not". */
    showWhenValue: text("show_when_value"),
    /**
     * R4.4. Which part of a person's record this answer is, or null.
     *
     * One of the core keys `PERSON_TARGETS` names, or `custom:<field id>` for
     * one of the church's own fields. A church writes its questions in its own
     * words, so the label cannot be read for meaning and the builder asks once
     * here instead.
     */
    mapsTo: text("maps_to"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("form_field_tenant_idx").on(t.tenantId),
    index("form_field_form_idx").on(t.tenantId, t.formId, t.position),
  ],
);

/**
 * R4.4. One answered form, as it arrived.
 *
 * The answers are kept as they were given, keyed by question. A church that
 * renames a question later still has the words the person read, because the
 * question row is the same row and the answer still points at it.
 *
 * HRT-151 is where a submission becomes a person record. This table is what it
 * reads and what the responses count on the forms list already counts.
 */
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: pk(),
    tenantId: tenantId(),
    formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
    /** Question id to answer, the shape `FormAnswer` describes. */
    answers: jsonb("answers").notNull(),
    /**
     * R4.4. Who this turned out to be, once anybody is sure.
     *
     * Null while it is waiting for somebody to look, and null for a form that
     * asks nothing a person can be found by.
     */
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    /** "created", "matched", "review" or "none". */
    matchState: text("match_state").notNull().default("none"),
    createdAt: created(),
  },
  (t) => [
    index("form_submission_tenant_idx").on(t.tenantId),
    index("form_submission_form_idx").on(t.tenantId, t.formId, t.createdAt),
    index("form_submission_person_idx").on(t.tenantId, t.personId),
    index("form_submission_review_idx").on(t.tenantId, t.matchState),
  ],
);
