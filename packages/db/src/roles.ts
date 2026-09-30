/** R1.4. Built-in roles. */
export const TENANT_ROLES = [
  "owner", "admin", "staff", "finance", "pastoral",
  "group_leader", "team_leader", "checkin_volunteer", "member",
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

/**
 * R1.5 and R21.2. Field-level permissions, enforced here at the query layer
 * rather than in a template. If data is hidden only by the view, it is not
 * hidden, so every repository assumes its consumer is the API.
 */
export const CAN_READ_CONFIDENTIAL_NOTES: readonly TenantRole[] = ["owner", "pastoral"];

/** Giving amounts arrive in 0.3. The rule is recorded now so it is not forgotten. */
export const CAN_READ_GIVING_AMOUNTS: readonly TenantRole[] = ["owner", "finance"];

export const canReadConfidentialNotes = (role: TenantRole): boolean =>
  CAN_READ_CONFIDENTIAL_NOTES.includes(role);

export const canReadGivingAmounts = (role: TenantRole): boolean =>
  CAN_READ_GIVING_AMOUNTS.includes(role);
