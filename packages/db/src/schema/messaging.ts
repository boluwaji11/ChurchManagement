import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
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
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("contact_consent_unique").on(t.tenantId, t.memberId, t.channel),
    index("contact_consent_tenant_idx").on(t.tenantId),
    index("contact_consent_member_idx").on(t.tenantId, t.memberId),
  ],
);
