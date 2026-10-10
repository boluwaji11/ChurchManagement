import {
  pgTable, uuid, text, boolean, integer, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, appUsers, storedFiles } from "./tenancy";
import { members } from "./members";
import { groups } from "./groups";
import { teams } from "./serving";

/**
 * R16.9, R17.1. A conversation, and who is in it.
 *
 * A church is not one desk. A member writes to the office about the hall and
 * to their group leader about Tuesday, so a message has somebody on the other
 * end rather than one destination everything falls into.
 *
 * The office is in a conversation as a role rather than as a person: whoever
 * is on staff this month answers, and the thread belongs to the church rather
 * than to whoever happened to reply.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /**
     * "church" with the office, "direct" between two people, "group" or
     * "team" with everybody in one.
     */
    kind: text("kind").notNull().default("church"),
    /** R9.7. Whose it is, where it belongs to a group or a team. */
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("conversations_tenant_idx").on(t.tenantId, t.lastMessageAt)],
);

/** R16.9. One row a person, plus one for the office where the church is in it. */
export const conversationPeople = pgTable(
  "conversation_people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    /** True on the one row that stands for the church office. */
    office: boolean("office").notNull().default(false),
    /** What this reader has seen. Theirs alone. */
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("conversation_people_member_idx").on(t.tenantId, t.memberId)],
);

/** R16.9. One message. Never edited after it is sent, never hard deleted. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /** Written as the church rather than as the person who typed it. */
    fromOffice: boolean("from_office").notNull().default(false),
    authorMemberId: uuid("author_member_id").references(() => members.id, { onDelete: "set null" }),
    authorUserId: uuid("author_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    /** R16.9. The line this one answers, where it answers one. */
    replyToId: uuid("reply_to_id"),
    /** R16.9. When it was last changed, so the line can say so. */
    editedAt: timestamp("edited_at", { withTimezone: true }),
    /** R2.13. Taken back: the row stays, the words go. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("messages_thread_idx").on(t.conversationId, t.createdAt),
    index("messages_tenant_idx").on(t.tenantId),
  ],
);

/**
 * R16.9. A message somebody started and has not sent.
 *
 * One a recipient, kept as it is typed, so coming back to it finds the words
 * rather than an empty box.
 */
export const messageDrafts = pgTable(
  "message_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    /** "office", or the id of the member it is addressed to. */
    target: text("target").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("message_draft_once").on(t.tenantId, t.userId, t.target)],
);

/**
 * R16.9. A mark against a message.
 *
 * The shortest answer there is. Eleven lines of "thanks" under a notice bury
 * it; eleven marks against it say the same thing and leave it readable.
 *
 * One row a person a mark, so pressing it again takes it off.
 */
export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    /** The mark itself, as the character it is. */
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("message_reaction_once").on(t.messageId, t.memberId, t.emoji),
    index("message_reaction_message_idx").on(t.messageId),
  ],
);

/**
 * R16.9, R16.14. What is sent with a message.
 *
 * A church sends the rota as a photograph of a whiteboard and the consent
 * form as a PDF, and a conversation that cannot carry either sends people
 * back to email. The bytes go through the one upload path, so the type, the
 * size and the church's quota are checked before anything is written.
 */
export const messageFiles = pgTable(
  "message_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull().references(() => storedFiles.id, { onDelete: "cascade" }),
    /** The name it arrived with, which is what the line shows. */
    label: text("label"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("message_file_tenant_idx").on(t.tenantId),
    index("message_file_message_idx").on(t.messageId, t.position),
    uniqueIndex("message_file_once").on(t.messageId, t.fileId),
  ],
);
