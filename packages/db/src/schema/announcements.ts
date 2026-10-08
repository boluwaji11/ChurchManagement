import { pgTable, uuid, text, boolean, date, timestamp, index } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";

/**
 * R16.11. What a church tells everybody.
 *
 * The one thing in communication a church can do without holding anybody's
 * credentials: it is written here and read in the portal. Nothing is sent,
 * nothing is queued, and no provider is involved. A member who has turned
 * push on gets a push as well, through the browser's own service, which costs
 * the church nothing and is already built.
 */
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** R24.4. Which of the twelve it wears in the feed. */
    hue: text("hue").notNull().default("indigo"),
    /** R16.11. Held at the top of the feed until it is taken down. */
    pinned: boolean("pinned").notNull().default(false),
    /** Nothing reaches a member until it is published. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /**
     * R16.11. The day it stops being news.
     *
     * A church announcing a work day on the 14th does not want it at the top
     * of the feed on the 15th, and nobody goes back to take one down.
     */
    expiresOn: date("expires_on"),
    writtenByUserId: uuid("written_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("announcements_tenant_idx").on(t.tenantId),
    index("announcements_feed_idx").on(t.tenantId, t.publishedAt),
  ],
);
