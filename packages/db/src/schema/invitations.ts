import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants, appUsers } from "./tenancy";
import { people } from "./people";
import { tenantRole } from "./enums";

/**
 * R1.7. Invitation by email with a role, an expiry, and revocation.
 *
 * Deliberately keyed on email rather than on a pre-created auth user, because
 * creating users requires the Supabase service role key and that key has no
 * business existing in this application. Instead: an invitation is a row here,
 * the invitee signs in with a magic link like anyone else, and on first sign-in
 * their verified email is matched against pending invitations.
 *
 * The email must be verified by Supabase before the match happens, or the
 * invitation becomes a way to join any church by claiming someone's address.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: tenantRole("role").notNull().default("staff"),
    /**
     * R1.7. The record this account is for, where the church knows which one.
     *
     * An invitation that grants a role and links no record leaves somebody
     * signed in to a church that has never heard of them. Set when a church
     * invites a person it already holds.
     */
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    invitedByUserId: uuid("invited_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("invitations_tenant_idx").on(t.tenantId),
    uniqueIndex("invitations_pending_unique").on(t.tenantId, t.email),
  ],
);

/**
 * R1.7. Somebody who came in through the church's join link and is not on its
 * records.
 *
 * A matched address needs none of this: the church already wrote that address
 * down, which is the proof, and the account claims the record and is a member.
 * This is for the rest. They are a visitor on the church's records and nothing
 * more until an admin says otherwise, because a member can see group rosters
 * and a forwarded link is not a congregation.
 */
export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    /** The visitor record created for them, which is what an approval adopts. */
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    fullName: text("full_name"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByUserId: uuid("decided_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** "approved" or "declined", and null while it waits. */
    outcome: text("outcome"),
  },
  (t) => [
    index("join_requests_tenant_idx").on(t.tenantId),
    uniqueIndex("join_requests_open_unique")
      .on(t.tenantId, t.userId)
      .where(sql`decided_at is null`),
  ],
);
