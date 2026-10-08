import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { savedLists } from "./lists";

/**
 * R16.12. A mailer a church is working on.
 *
 * A letter to a congregation is written over a week, in the gaps between
 * everything else, and the volunteer writing it closes the laptop in the
 * middle. Held as a record so that is survivable: who it goes to, what it
 * prints on, and the words, kept as they are typed.
 */
export const mailers = pgTable(
  "mailers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** R24.6. The readable part of its address, unique within the church. */
    slug: text("slug").notNull(),
    /** "households", "people", or "list" with the list named below. */
    recipients: text("recipients").notNull().default("households"),
    listId: uuid("list_id").references(() => savedLists.id, { onDelete: "set null" }),
    /** Which stock the labels print on. A letter ignores it. */
    paper: text("paper").notNull().default("envelope"),
    /** How many labels have already gone off the first sheet. */
    skip: integer("skip").notNull().default(0),
    /** Which typeface the letter is set in. The words carry none. */
    font: text("font").notNull().default("inter"),
    /** How big it is set, in points. */
    fontSize: integer("font_size").notNull().default(11),
    /** The words, as markdown, exactly as the editor round-trips them. */
    body: text("body").notNull().default(""),
    createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** R2.13. Archive, never hard delete. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("mailers_tenant_idx").on(t.tenantId),
    uniqueIndex("mailers_name_unique").on(t.tenantId, t.name),
    uniqueIndex("mailers_slug_unique").on(t.tenantId, t.slug),
  ],
);
