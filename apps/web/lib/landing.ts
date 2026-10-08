import {
  membershipsForUser, canEditPeople, canReadIncidents, type TenantRole,
} from "@connectapp/db";

/**
 * R18.1, R5.5. Where somebody lands once they are signed in.
 *
 * The same answer whether they just signed in or pressed Sign in on the website
 * with a session already open, so the product opens on one screen rather than
 * two depending on how they arrived.
 */
export async function landingFor(userId: string): Promise<string> {
  try {
    const memberships = await membershipsForUser(userId);
    if (memberships.length !== 1) return "/dashboard";
    return landingForRole(memberships[0]!.role);
  } catch {
    return "/dashboard";
  }
}

/**
 * The same answer for a role already in hand.
 *
 * The church chooser knows the role without asking again, and it has to send
 * somebody to the same screen signing in would, or picking a church out of a
 * list lands somewhere else from signing in to it.
 */
export function landingForRole(role: TenantRole): string {
  // R5.5. The one role whose job is the follow-ups rather than the records.
  if (role === "pastoral") return "/followups";
  // Staff open the week on the dashboard, the screen the sidebar puts first.
  return canEditPeople(role) || canReadIncidents(role) ? "/dashboard" : "/home";
}
