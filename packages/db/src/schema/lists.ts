import { pgTable, uuid, text, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { members } from "./members";

/**
 * R1.14. A set of members a church has named, so it can be used again.
 *
 * Two kinds, because churches mean two different things by a list. "The members
 * I am calling this week" is a set somebody picked, and it should stay exactly
 * who they picked. "Everybody who visited and has no email" is a question, and
 * it should answer itself next month without anybody maintaining it.
 *
 * A rule is the directory's own filters, stored. That is the whole of the query
 * language, on purpose: a church that can narrow the directory can build a list,
 * and nobody has to learn a second thing. A query builder is where free church
 * software usually becomes unusable.
 */
export const savedLists = pgTable(
  "saved_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** "static" for a set somebody picked, "rule" for one that answers itself. */
    kind: text("kind").notNull().default("static"),
    /** The directory filters, for a rule list. Null on a static one. */
    rule: jsonb("rule").$type<Record<string, string>>(),
    createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("saved_lists_tenant_idx").on(t.tenantId),
    uniqueIndex("saved_lists_name_unique").on(t.tenantId, t.name),
  ],
);

/** Who is on a static list. A rule list has no rows here. */
export const savedListMembers = pgTable(
  "saved_list_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    listId: uuid("list_id").notNull().references(() => savedLists.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("saved_list_members_tenant_idx").on(t.tenantId),
    uniqueIndex("saved_list_members_unique").on(t.listId, t.memberId),
  ],
);
