import { pgTable, uuid, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { members } from "./members";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () =>
  uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });

/**
 * R3.2, R3.3. What a member lets other members see of them.
 *
 * Every field is off until the member turns it on, and the row only exists once
 * they have touched it. A church that imports two hundred members has not been
 * given consent by any of them to publish their phone numbers, so the absence
 * of a row means the safest answer rather than the most useful one.
 *
 * The admin directory (R3.6) ignores all of this. These settings are about what
 * other members see, which is a different question from what the church holds.
 */
export const directoryPreferences = pgTable(
  "directory_preferences",
  {
    id: pk(),
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    /** R3.3. Off means absent from the member directory, still in the database. */
    listed: boolean("listed").notNull().default(true),
    showEmail: boolean("show_email").notNull().default(false),
    showPhone: boolean("show_phone").notNull().default(false),
    showAddress: boolean("show_address").notNull().default(false),
    showBirthday: boolean("show_birthday").notNull().default(false),
    showPhoto: boolean("show_photo").notNull().default(false),
    /**
     * R3.4. Set by the head of the household: whether the children in it appear
     * at all. Never carries contact details with it.
     */
    showChildren: boolean("show_children").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("directory_prefs_person_key").on(t.tenantId, t.memberId),
    index("directory_prefs_tenant_idx").on(t.tenantId),
  ],
);
