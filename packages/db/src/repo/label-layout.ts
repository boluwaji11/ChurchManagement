import { eq } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { canManageStations } from "./stations";
import { InvalidInputError } from "../errors";
import { LABEL_SIZES, DEFAULT_LABEL_LAYOUT, type LabelLayout, type LabelSize } from "./label-rules";

export * from "./label-rules";

/**
 * R8.11. What goes on a child's label, and on the stock it prints on.
 *
 * One layout for the church rather than one per station, because a parent who
 * collects from two doors should be handed the same label, and a tablet
 * swapped out minutes before a service should print what the one before it
 * printed.
 *
 * The name and the room colour are always on it. They are what the label is
 * for, so neither is a switch.
 */

export async function getLabelLayout(db: Tx, tenantId: string): Promise<LabelLayout> {
  const [row] = await db
    .select({
      showRoom: tenants.labelShowRoom,
      showAllergies: tenants.labelShowAllergies,
      showCode: tenants.labelShowCode,
      showService: tenants.labelShowService,
      parentTag: tenants.labelParentTag,
      size: tenants.labelSize,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!row) return DEFAULT_LABEL_LAYOUT;
  return {
    ...row,
    size: (row.size in LABEL_SIZES ? row.size : "brother_24x11") as LabelSize,
  };
}

export async function setLabelLayout(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  input: LabelLayout,
): Promise<void> {
  if (!canManageStations(actor.role)) throw new PermissionError(actor.role, "manageStations");
  if (!(input.size in LABEL_SIZES)) throw new InvalidInputError("labels.error.size");

  await db
    .update(tenants)
    .set({
      labelShowRoom: input.showRoom,
      labelShowAllergies: input.showAllergies,
      labelShowCode: input.showCode,
      labelShowService: input.showService,
      labelParentTag: input.parentTag,
      labelSize: input.size,
    })
    .where(eq(tenants.id, actor.tenantId));
}
