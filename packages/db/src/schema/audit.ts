import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { auditAction } from "./enums";

/**
 * R1.11 and R21.5. Append only.
 *
 * Writes come from a database trigger rather than application code, so a code
 * path cannot forget to audit. UPDATE and DELETE are revoked from the
 * application role, which is what makes the acceptance criterion true: the log
 * cannot be modified or deleted by any application role, including Owner.
 *
 * Reads of confidential notes are recorded here too, which is why the action
 * enum includes 'read'.
 */
export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id"),
    actorRole: text("actor_role"),
    action: auditAction("action").notNull(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_tenant_idx").on(t.tenantId, t.at),
    index("audit_entity_idx").on(t.tenantId, t.entity, t.entityId),
  ],
);
