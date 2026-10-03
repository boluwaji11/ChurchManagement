import {
  pgTable, uuid, text, integer, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, storedFiles } from "./tenancy";
import { serviceOccurrences } from "./gatherings";
import { teams, teamPositions } from "./serving";
import { people } from "./people";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R11.1. The order of service for one gathering.
 *
 * One plan a gathering, because a church with two services on a day runs two
 * plans even where the order is identical: the second one drops the baptism and
 * runs four minutes short, and a shared plan cannot say so.
 */
export const servicePlans = pgTable(
  "service_plans",
  {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: uuid("occurrence_id").notNull()
      .references(() => serviceOccurrences.id, { onDelete: "cascade" }),
    /** What this gathering is called on the plan, where it differs from the service. */
    title: text("title"),
    /** "Advent", "The Sermon on the Mount". The run of weeks this belongs to. */
    series: text("series"),
    /** The one idea of the day, in the leader's words. */
    theme: text("theme"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("plan_tenant_idx").on(t.tenantId),
    uniqueIndex("plan_occurrence_unique").on(t.occurrenceId),
  ],
);

/**
 * R11.2. One line of the order of service.
 *
 * The duration is minutes and it is required, because the running total in
 * R11.3 is the reason anybody opens this screen, and an item with no length
 * makes the total a guess. Five minutes is the default: wrong often, and wrong
 * in a way somebody corrects in one keystroke.
 */
export const planItems = pgTable(
  "plan_items",
  {
    id: pk(),
    tenantId: tenantId(),
    planId: uuid("plan_id").notNull().references(() => servicePlans.id, { onDelete: "cascade" }),
    /**
     * "song", "scripture", "sermon", "announcement", "media", "prayer",
     * "offering" or "custom". Text rather than an enum, because a church that
     * runs a thing we have no word for should not be blocked by a migration.
     */
    kind: text("kind").notNull().default("custom"),
    title: text("title").notNull(),
    /** What happens, for whoever is reading the plan rather than running it. */
    description: text("description"),
    minutes: integer("minutes").notNull().default(5),
    position: integer("position").notNull().default(0),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("plan_item_tenant_idx").on(t.tenantId),
    index("plan_item_plan_idx").on(t.tenantId, t.planId, t.position),
  ],
);

/**
 * R11.6. A note on an item, and who it is for.
 *
 * A plan carries two kinds of writing. The description on the item is what the
 * thing is, and everybody reading the plan sees it. A note is an instruction,
 * and most instructions are for one person: the drummer comes in on the second
 * verse, the sound desk drops the click after the bridge. Addressing it means
 * the drummer reads the drummer's note instead of reading forty of them.
 *
 * All three targets empty means everybody. They are narrowing, so a note on the
 * Drums position reaches whoever is scheduled to play drums, whoever that turns
 * out to be by the time the gathering comes round.
 */
export const planItemNotes = pgTable(
  "plan_item_notes",
  {
    id: pk(),
    tenantId: tenantId(),
    itemId: uuid("item_id").notNull().references(() => planItems.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    positionId: uuid("position_id").references(() => teamPositions.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("plan_note_tenant_idx").on(t.tenantId),
    index("plan_note_item_idx").on(t.tenantId, t.itemId),
  ],
);

/**
 * R11.7. A file hanging off an item: a chord chart, a PDF, a reference track.
 *
 * The bytes are in the object store and the ledger row is in stored_files. This
 * is the join, plus the name a musician reads, because "chart.pdf" and the
 * random key the file is stored under are both useless on a music stand.
 */
export const planItemFiles = pgTable(
  "plan_item_files",
  {
    id: pk(),
    tenantId: tenantId(),
    itemId: uuid("item_id").notNull().references(() => planItems.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull().references(() => storedFiles.id, { onDelete: "cascade" }),
    /** What to call it on screen. Falls back to the kind of file it is. */
    label: text("label"),
    position: integer("position").notNull().default(0),
    createdAt: created(),
  },
  (t) => [
    index("plan_file_tenant_idx").on(t.tenantId),
    index("plan_file_item_idx").on(t.tenantId, t.itemId, t.position),
    uniqueIndex("plan_file_unique").on(t.itemId, t.fileId),
  ],
);
