import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () =>
  uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R16.2. The church's own email provider.
 *
 * Hearth sends through the church's account, so a church that grows out of a
 * free tier is in a conversation with Resend rather than with us. One row per
 * church. The API key or SMTP password is encrypted by the application, so the
 * database holds a string it cannot read.
 *
 * Verification is a real send to the address of whoever set it up, because a
 * provider that accepts a key and refuses a message has told the church nothing
 * until a Sunday morning.
 */
export const emailSenders = pgTable(
  "email_senders",
  {
    id: pk(),
    tenantId: tenantId(),
    /** "resend" or "smtp". */
    provider: text("provider").notNull(),
    /** The name a member sees in their inbox. */
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    /** Where a reply goes, when that is not the from address. */
    replyTo: text("reply_to"),
    /** The API key or the SMTP password, sealed. */
    secret: text("secret"),
    host: text("host"),
    port: integer("port"),
    username: text("username"),
    /** When a test message was last accepted by the provider. */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** What the provider said the last time it refused one. */
    lastError: text("last_error"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("email_senders_tenant_key").on(t.tenantId),
    index("email_senders_tenant_idx").on(t.tenantId),
  ],
);
