import {
  pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { members } from "./members";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * HRT-286, HRT-287, R16.1, R16.2, R21.15. The wiring a church's own messaging
 * accounts hang off.
 *
 * Nothing in this file sends anything. There is no queue, no composer and no
 * message table. What is here is the state of a church's connection to its own
 * providers, the state of the registrations those providers require, and who
 * in the congregation has agreed to be contacted.
 *
 * The church owns every account and pays every bill. We carry the forms.
 */

/**
 * R16.1, R16.2, R21.15. A church's own account with a provider.
 *
 * The credential is sealed before it reaches this column and is never selected
 * by a read path. `providerFor` leaves it off the record entirely, which is the
 * field-level rule: a screen that forgets to hide it must still not receive it.
 */
export const churchProviders = pgTable(
  "church_providers",
  {
    id: pk(),
    tenantId: tenantId(),
    /** "email" or "sms". */
    channel: text("channel").notNull(),
    /** "resend", "twilio" or "smtp". */
    vendor: text("vendor").notNull(),
    /**
     * "connected" or "disconnected".
     *
     * A disconnected row is kept rather than deleted, because a church
     * reconnecting the same account should not read as a new one, and the
     * registrations hanging off it are still the registrations it had.
     */
    state: text("state").notNull().default("disconnected"),
    /**
     * What the vendor calls this account: a Twilio subaccount SID, a Resend
     * team id. Safe to read and safe to show on screen.
     */
    externalAccountId: text("external_account_id"),
    /** R21.15. The sealed credential. Null until the church connects. */
    credential: text("credential"),
    /** Which key sealed it, so a key rotates without the secret being read. */
    credentialKeyId: text("credential_key_id"),
    /**
     * R16.1. The name and address mail goes out as.
     *
     * What a member reads in their inbox, which is the church rather than us,
     * so it is set once here and every send uses it.
     */
    fromName: text("from_name"),
    fromAddress: text("from_address"),
    /**
     * HRT-287. The connection details that are not secret.
     *
     * A church's own mail server needs a host, a port and a username, none of
     * which is a secret and all of which the screen has to show back. The
     * password is the sealed credential above. Resend keeps this empty.
     */
    settings: jsonb("settings").notNull().default({}),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    connectedBy: uuid("connected_by"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    /** What the provider last said went wrong, in its words. */
    lastError: text("last_error"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("church_provider_unique").on(t.tenantId, t.channel, t.vendor),
    index("church_provider_tenant_idx").on(t.tenantId),
  ],
);

/**
 * R16.1. A domain a church sends from, and how far its verification has got.
 *
 * The records we asked for are kept, because a volunteer closes the tab
 * halfway through typing them into their registrar and the screen they come
 * back to has to be the same screen.
 */
export const churchSendingDomains = pgTable(
  "church_sending_domains",
  {
    id: pk(),
    tenantId: tenantId(),
    providerId: uuid("provider_id").references(() => churchProviders.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    /** "pending", "verified" or "failed". */
    state: text("state").notNull().default("pending"),
    /** What we asked them to publish, as the registrar's form wants it. */
    records: jsonb("records").notNull().default([]),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("church_sending_domain_unique").on(t.tenantId, t.domain),
    index("church_sending_domain_tenant_idx").on(t.tenantId),
  ],
);

/**
 * R16.2. The carrier registration a church needs before a single text leaves.
 *
 * Two kinds, in order. The brand is the church as an organisation, and the
 * campaign is what it intends to send. A campaign cannot be submitted before
 * its brand is approved, and either can be refused days later, which is the
 * whole reason this is a table rather than a boolean.
 */
export const churchRegistrations = pgTable(
  "church_registrations",
  {
    id: pk(),
    tenantId: tenantId(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => churchProviders.id, { onDelete: "cascade" }),
    /** "brand" or "campaign". */
    kind: text("kind").notNull(),
    /** "draft", "submitted", "in_review", "approved" or "rejected". */
    state: text("state").notNull().default("draft"),
    externalId: text("external_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    /** Why it was refused, as the carrier said it. */
    rejectionCode: text("rejection_code"),
    rejectionDetail: text("rejection_detail"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("church_registration_unique").on(t.tenantId, t.providerId, t.kind),
    index("church_registration_tenant_idx").on(t.tenantId),
  ],
);

/**
 * R16.8. Who has agreed to be contacted, and what they agreed to.
 *
 * A congregation imported from a spreadsheet has no consent record, and that
 * is the honest answer rather than an inconvenient one: the carrier asks how
 * people opted in, and "they were in a CSV" is not an answer.
 *
 * Per channel, because agreeing to a newsletter is not agreeing to a text.
 */
export const contactConsent = pgTable(
  "contact_consent",
  {
    id: pk(),
    tenantId: tenantId(),
    /**
     * R16.8. Null for somebody a church writes to who is not on its list: a
     * roofer, a county office, a visiting speaker. They may ask to be left
     * alone too, and a message with no way out is one this product will not
     * send, so the address below stands in for the person.
     */
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    /** The address, where there is no member behind it. */
    address: text("address"),
    /** "email" or "sms". */
    channel: text("channel").notNull(),
    /** "granted", "withdrawn" or "unknown". */
    state: text("state").notNull().default("unknown"),
    /** "form", "paper", "verbal", "import" or "portal". */
    source: text("source"),
    /** The church's own note of the evidence, which is what a regulator reads. */
    evidence: text("evidence"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    capturedBy: uuid("captured_by"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    /**
     * R16.8. The way out, which every message carries.
     *
     * A token rather than a member id in the address, because an unsubscribe
     * link is forwarded, pasted into chat groups and crawled, and a guessable
     * one lets anybody take anybody off the church's list.
     */
    token: text("token"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("contact_consent_unique").on(t.tenantId, t.memberId, t.channel),
    index("contact_consent_tenant_idx").on(t.tenantId),
    index("contact_consent_member_idx").on(t.tenantId, t.memberId),
  ],
);

/**
 * HRT-139, R16.4, R16.6. A message a church sent to its people.
 *
 * The words are kept as they were sent rather than as a reference to a draft
 * that can be edited afterwards: "what did we actually send on Tuesday" has
 * one answer and it is this row.
 */
export const emailSends = pgTable(
  "email_sends",
  {
    id: pk(),
    tenantId: tenantId(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    /** "everyone", "list" or "group". */
    audience: text("audience").notNull(),
    audienceId: uuid("audience_id"),
    /** What that list or group was called when it went, which can be renamed. */
    audienceName: text("audience_name"),
    /** "draft", "queued", "sending", "sent" or "failed". */
    state: text("state").notNull().default("draft"),
    /**
     * R16.6. When this should go. Null is now.
     *
     * A church writes the carol service invitation on Tuesday evening and
     * wants it to land on Friday morning, which is a field rather than a
     * reminder to come back and press send.
     */
    sendAt: timestamp("send_at", { withTimezone: true }),
    /** R16.6. When a worker last took a batch of this, so two never take one. */
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    /** R16.8. The church's own address, so the worker's links are absolute. */
    origin: text("origin"),
    total: integer("total").notNull().default(0),
    delivered: integer("delivered").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    sentBy: uuid("sent_by"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("email_send_tenant_idx").on(t.tenantId, t.createdAt)],
);

/**
 * R16.6, R16.7. One row a person, so a bounce belongs to the address that bounced.
 *
 * "We emailed everybody on Tuesday" is not an answer when somebody says they
 * never got it.
 */
export const emailRecipients = pgTable(
  "email_recipients",
  {
    id: pk(),
    tenantId: tenantId(),
    sendId: uuid("send_id").notNull().references(() => emailSends.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    address: text("address").notNull(),
    /** "queued", "sending", "sent", "failed" or "bounced". */
    state: text("state").notNull().default("queued"),
    /** What the provider said when it refused, in its own words. */
    said: text("said"),
    /** R16.7. How many times this copy has been attempted. */
    attempts: integer("attempts").notNull().default(0),
    /** R16.7. Not before this. Null is now. */
    nextTry: timestamp("next_try", { withTimezone: true }),
    /** R16.7. What the provider called it, for matching its later verdict. */
    providerRef: text("provider_ref"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("email_recipient_send_idx").on(t.tenantId, t.sendId),
    index("email_recipient_member_idx").on(t.tenantId, t.memberId),
  ],
);
