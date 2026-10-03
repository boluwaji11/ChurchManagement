import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R16.1, R16.2, R21.15. The church's own messaging account.
 *
 * Churches supply their own credentials and we never resell a message, so what
 * is held here is somebody else's secret. The password is encrypted by the
 * application before it reaches the database, so a database that leaks does not
 * hand anybody a working mail account, and it is never read back out to a
 * screen: a settings page shows that a password is set and offers to replace
 * it.
 *
 * One row a kind a church, so SMTP now and Twilio later need no second table.
 */
export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: pk(),
    tenantId: tenantId(),
    /** "smtp" today. "twilio" when R16.2 lands. */
    kind: text("kind").notNull(),
    /** Everything that is not a secret: host, port, the address it sends from. */
    settings: jsonb("settings").notNull().default({}),
    /** AES-256-GCM, written by the application. */
    secretEncrypted: text("secret_encrypted"),
    /** When the credentials last sent something successfully. */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("provider_tenant_idx").on(t.tenantId),
    uniqueIndex("provider_kind_unique").on(t.tenantId, t.kind),
  ],
);

/**
 * R16.3. Every transactional message, and which account carried it.
 *
 * The ledger is what makes the shared allowance honest. A church can see what
 * it has used and on what, and a church that has set up its own account can see
 * that its own account is the one sending, which is the question somebody asks
 * the first time a message does not arrive.
 *
 * Bulk sending is not in here. That has its own queue, in R16.6.
 */
export const emailSends = pgTable(
  "email_sends",
  {
    id: pk(),
    tenantId: tenantId(),
    /** "invitation", "password_reset", "checkin_receipt", "serving_request". */
    purpose: text("purpose").notNull(),
    toEmail: text("to_email").notNull(),
    /** "church" for the church's own account, "shared" for the allowance. */
    via: text("via").notNull(),
    /** "sent", "failed" or "refused" when the allowance is spent. */
    status: text("status").notNull(),
    /** What the mail server said, when it refused. Never a credential. */
    reason: text("reason"),
    sentAt: created(),
  },
  (t) => [
    index("email_send_tenant_idx").on(t.tenantId, t.sentAt),
    index("email_send_via_idx").on(t.tenantId, t.via, t.sentAt),
  ],
);

/**
 * R16.4. A message a church writes once and sends many times.
 *
 * The body carries merge fields as `{{first_name}}`, resolved against each
 * recipient when the message goes out. Plain text with a small set of names
 * rather than a template language, because the person writing it is a volunteer
 * and the failure mode of a template language is a message that goes to four
 * hundred people reading "undefined".
 */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: pk(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("message_template_tenant_idx").on(t.tenantId),
    uniqueIndex("message_template_name_unique").on(t.tenantId, t.name),
  ],
);
