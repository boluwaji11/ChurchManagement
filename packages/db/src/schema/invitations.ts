import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
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
