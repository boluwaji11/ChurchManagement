import {
  canEditPeople, canReadIncidents, canCheckIn, canFollowUp, canLeadTeams, canManageGroups,
  type TenantRole, type Permission,
} from "@connectapp/db";

/**
 * R17.1. Whether this reader gets the portal rather than the app.
 *
 * Somebody with no job in the product: not staff, not on a check-in station,
 * not working follow-ups, not running a team or a group. They read the church's
 * own screens in the portal's frame, which is a row of tabs over one centred
 * column, and never the sidebar the rest of the product works in.
 *
 * One definition, because the test was written out at each screen that needed
 * it and two of them had already drifted.
 */
export function readsAsMember(who: {
  role: TenantRole;
  permissions?: readonly Permission[] | null;
}): boolean {
  return (
    !canEditPeople(who)
    && !canReadIncidents(who)
    && !canCheckIn(who)
    && !canFollowUp(who)
    && !canLeadTeams(who)
    && !canManageGroups(who)
  );
}
