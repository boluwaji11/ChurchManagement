import { pgTable, uuid, text, timestamp, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { people } from "./people";

/**
 * R2.9. What somebody can do, cares about, and is gifted in.
 *
 * Three lists rather than one, because a church asks three different questions.
 * "Who can drive a minibus" is a skill. "Who cares about prison ministry" is an
 * interest, and the people who answer it are often not the people with the
 * skill. "Who has a gift of teaching" is a third thing again, and a church that
 * runs on gifting language will not accept it filed under skills.
 *
 * A managed vocabulary rather than free text, because the whole value is the
 * question "who can do this", and free text answers it with nine spellings of
 * carpentry. The church owns the list and can add to it.
 *
 * Deliberately not tags. A tag is a label the office puts on somebody for its
 * own filing. This is a claim about the person, usually one they made about
 * themselves, and it is read when a church is short of somebody on a Tuesday.
 */
export const ABILITY_KINDS = ["skill", "interest", "gift"] as const;
export type AbilityKind = (typeof ABILITY_KINDS)[number];

export const abilities = pgTable(
  "abilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** "skill", "interest" or "gift". */
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("abilities_tenant_idx").on(t.tenantId, t.kind),
    uniqueIndex("abilities_name_unique").on(t.tenantId, t.kind, t.name),
  ],
);

/** Who has it. Nothing more: when and how well are questions for 0.4's teams. */
export const personAbilities = pgTable(
  "person_abilities",
  {
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    abilityId: uuid("ability_id").notNull().references(() => abilities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.abilityId] }),
    index("person_abilities_tenant_idx").on(t.tenantId),
    index("person_abilities_ability_idx").on(t.tenantId, t.abilityId),
  ],
);
