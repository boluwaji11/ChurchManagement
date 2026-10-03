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
