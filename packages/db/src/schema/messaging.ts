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

/**
 * R16.6. One bulk send, and where it has got to.
 *
 * A send is a record before it is an action. A church that closes the laptop
 * halfway through four hundred messages comes back to a job that carried on,
 * and a church that scheduled one for Thursday has something to look at on
 * Wednesday.
 *
 * Bulk sending runs on the church's own account, always. The shared allowance
 * in R16.3 is for the handful of transactional messages that have to work on a
 * church's first day.
 */
export const sends = pgTable(
  "sends",
  {
    id: pk(),
    tenantId: tenantId(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    /** How the audience was chosen, kept so the screen can say who it went to. */
    audienceKind: text("audience_kind").notNull(),
    audienceId: uuid("audience_id"),
    audienceName: text("audience_name").notNull(),
    /** "scheduled", "sending", "sent", "cancelled" or "failed". */
    status: text("status").notNull().default("scheduled"),
    /** When it should go. Now, for a send that was not scheduled. */
    sendAt: timestamp("send_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    /** Why it stopped, where it did. */
    reason: text("reason"),
    createdByUserId: uuid("created_by_user_id"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("send_tenant_idx").on(t.tenantId, t.createdAt),
    index("send_due_idx").on(t.status, t.sendAt),
  ],
);

/**
 * R16.6. One address in one send.
 *
 * A row a person rather than a count, because the question after a send is
 * which three did not arrive, and a counter cannot answer it.
 */
export const sendRecipients = pgTable(
  "send_recipients",
  {
    id: pk(),
    tenantId: tenantId(),
    sendId: uuid("send_id").notNull().references(() => sends.id, { onDelete: "cascade" }),
    personId: uuid("person_id"),
    toEmail: text("to_email").notNull(),
    /** The message as this person reads it, merged when the send was queued. */
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    /** "pending", "sent" or "failed". */
    status: text("status").notNull().default("pending"),
    reason: text("reason"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    index("send_recipient_tenant_idx").on(t.tenantId),
    index("send_recipient_send_idx").on(t.sendId, t.status),
  ],
);
