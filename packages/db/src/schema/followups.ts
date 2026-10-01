import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, integer, date, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { people } from "./people";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () =>
  uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R5.1, R5.2. A pipeline: the steps a church takes with somebody, in order.
 *
 * Six of these, written down rather than configurable (R5.8 is 1.x). Rock RMS
 * has a workflow engine and it is the reason a volunteer cannot use Rock RMS. A
 * church that wants to welcome a visitor needs the steps, not a canvas on which
 * to draw them.
 *
 * Each is seeded with the church and can be renamed or switched off. What
 * cannot be done is inventing a seventh, which is the whole point.
 */
export const pipelines = pgTable(
  "pipelines",
  {
    id: pk(),
    tenantId: tenantId(),
    /** What the code triggers on: first_visit, second_visit, absent, and so on. */
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    hue: text("hue").notNull().default("sky"),
    position: integer("position").notNull().default(0),
    /** R5.3. Who the steps land on when nobody is named. */
    ownerUserId: uuid("owner_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** Off means nobody is added to it, by hand or by a trigger. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("pipeline_tenant_idx").on(t.tenantId),
    uniqueIndex("pipeline_key_unique").on(t.tenantId, t.key),
  ],
);

/** R5.1. One step of a pipeline, and how long the church gives itself for it. */
export const pipelineSteps = pgTable(
  "pipeline_steps",
  {
    id: pk(),
    tenantId: tenantId(),
    pipelineId: uuid("pipeline_id").notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    name: text("name").notNull(),
    /** Days after somebody enters the pipeline that this step is due. */
    dueDays: integer("due_days").notNull().default(2),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("pipeline_step_tenant_idx").on(t.tenantId),
    index("pipeline_step_pipeline_idx").on(t.tenantId, t.pipelineId),
  ],
);

/**
 * R5.1, R5.4. Somebody in a pipeline.
 *
 * One open entry per person per pipeline, so a visitor who comes twice in a
 * fortnight is welcomed once rather than twice. Leaving is recorded with a
 * reason, because "where did the eleven people in this stage go" is the
 * question a pastor asks of this screen.
 */
export const pipelineEntries = pgTable(
  "pipeline_entries",
  {
    id: pk(),
    tenantId: tenantId(),
    pipelineId: uuid("pipeline_id").notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** open, done, or left. */
    status: text("status").notNull().default("open"),
    /** What put them here: by_hand, first_visit, second_visit, absent, milestone. */
    reason: text("reason").notNull().default("by_hand"),
    startedOn: date("started_on").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** R5.4. Why they came out, in the church's own words. */
    exitReason: text("exit_reason"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("pipeline_entry_tenant_idx").on(t.tenantId),
    index("pipeline_entry_person_idx").on(t.tenantId, t.personId),
    index("pipeline_entry_pipeline_idx").on(t.tenantId, t.pipelineId, t.status),
    // One open entry per person per pipeline. A visitor who comes twice in a
    // fortnight is welcomed once.
    uniqueIndex("pipeline_entry_open_unique")
      .on(t.tenantId, t.pipelineId, t.personId)
      .where(sql`status = 'open'`),
  ],
);

/**
 * R5.1, R5.5, R5.6. One thing somebody has to do, by a day.
 *
 * Written out when a person enters a pipeline rather than worked out on the
 * way past, so a step can be reassigned, moved, or answered without the church
 * losing what happened. A task with no entry is R5.6: somebody wrote down a
 * thing to do about a person, attached to no pipeline at all.
 */
export const followUps = pgTable(
  "follow_ups",
  {
    id: pk(),
    tenantId: tenantId(),
    entryId: uuid("entry_id").references(() => pipelineEntries.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").references(() => pipelineSteps.id, { onDelete: "set null" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeUserId: uuid("assignee_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    dueOn: date("due_on"),
    position: integer("position").notNull().default(0),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneByUserId: uuid("done_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** R5.1. What happened, written when it is marked done. */
    outcome: text("outcome"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("follow_up_tenant_idx").on(t.tenantId),
    index("follow_up_person_idx").on(t.tenantId, t.personId),
    index("follow_up_entry_idx").on(t.tenantId, t.entryId),
    index("follow_up_queue_idx").on(t.tenantId, t.assigneeUserId, t.doneAt),
  ],
);
