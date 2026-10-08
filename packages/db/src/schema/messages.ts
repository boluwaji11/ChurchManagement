import {
  pgTable, uuid, text, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { members } from "./members";

/**
 * R16.9, R17.1. A thread between the church office and one member.
 *
 * The office is not a person. Whoever is on staff this month answers, and the
 * thread belongs to the church rather than to whoever happened to reply, so
 * there is one thread a member and it is found in the same place in March as
 * it was in August.
 *
 * Groups and teams come later on these same tables, by giving a conversation a
 * group instead of a member.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    /** When it was last written to, which is the order the list is read in. */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    /**
     * Two read marks, because one side of this is a role.
     *
     * A question that came off the unread list because a volunteer opened it
     * by accident is a question nobody answers.
     */
    memberReadAt: timestamp("member_read_at", { withTimezone: true }),
    staffReadAt: timestamp("staff_read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("conversations_tenant_idx").on(t.tenantId, t.lastMessageAt),
    uniqueIndex("conversation_once_a_member").on(t.tenantId, t.memberId),
  ],
);

/** R16.9. One message in a thread. Never edited, never hard deleted. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /** "member" or "church", which is who it reads as rather than who typed it. */
    side: text("side").notNull(),
    authorUserId: uuid("author_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** The words, as markdown, the same as every other box in the product. */
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("messages_thread_idx").on(t.conversationId, t.createdAt),
    index("messages_tenant_idx").on(t.tenantId),
  ],
);
