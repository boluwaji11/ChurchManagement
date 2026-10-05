import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";

/**
 * R24.6. Something that happened which somebody should know about.
 *
 * One row per recipient. A church of 50 to 500 has nought to two staff, so
 * fanning a join request out to the three members who can approve it is three
 * rows, and read state is then a column rather than a second table.
 *
 * The words are not stored. A message key and its values are, so a notification
 * written on Tuesday still reads in the language the person set on Friday, and
 * so a change of wording reaches the ones already sent.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** Who is being told. */
    userId: uuid("user_id").notNull(),
    /** What kind of thing happened, which picks the icon and the hue. */
    kind: text("kind").notNull(),
    /** The i18n key for the line, and whatever it interpolates. */
    messageKey: text("message_key").notNull(),
    params: jsonb("params").$type<Record<string, string | number>>(),
    /** Where pressing it goes, relative and without the church parameter. */
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notification_tenant_idx").on(t.tenantId),
    // The unread count and the panel are both this shape.
    index("notification_user_idx").on(t.tenantId, t.userId, t.readAt, t.createdAt),
  ],
);
