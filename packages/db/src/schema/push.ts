import { pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";

/**
 * R16.10, R17.11. Where a push goes.
 *
 * One row a browser rather than a person: somebody with a phone and a laptop
 * has two, and a church that reaches one and not the other has reached nobody
 * on the walk to the car.
 *
 * The endpoint is a URL at the browser's own push service, and the two keys are
 * what the payload is encrypted to. None of it identifies anybody outside this
 * table, and a subscription the browser has dropped answers 404 or 410 on the
 * next send, which is when the row goes.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** The account this browser is signed in as. */
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    /** The subscription's public key, which the payload is encrypted to. */
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    /** Which browser this is, so somebody can tell two of their own apart. */
    userAgent: text("user_agent"),
    /** When it last took a push, for clearing out what has gone quiet. */
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("push_tenant_idx").on(t.tenantId),
    index("push_user_idx").on(t.tenantId, t.userId),
    // One row an endpoint. A browser that re-subscribes replaces its own.
    uniqueIndex("push_endpoint_unique").on(t.endpoint),
  ],
);
