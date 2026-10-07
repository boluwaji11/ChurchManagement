import { t } from "@connectapp/i18n";
import { can, rolesWith, type TenantRole, type Who } from "./permissions";

export {
  TENANT_ROLES, PERMISSIONS, PERMISSION_GROUPS, ROLE_PERMISSIONS, can, rolesWith,
  type TenantRole, type Permission, type PermissionGroup, type Who,
} from "./permissions";

/**
 * R1.5 and R21.2. Field-level permissions, enforced here at the query layer
 * rather than in a template. If data is hidden only by the view, it is not
 * hidden, so every repository assumes its consumer is the API.
 */
export const CAN_READ_CONFIDENTIAL_NOTES: readonly TenantRole[] = rolesWith("members.notes.confidential");

/** Giving amounts arrive in 0.3. The rule is recorded now so it is not forgotten. */
export const CAN_READ_GIVING_AMOUNTS: readonly TenantRole[] = rolesWith("giving.amounts");

export const canReadConfidentialNotes = (role: Who): boolean =>
  can(role, "members.notes.confidential");

export const canReadGivingAmounts = (role: Who): boolean =>
  can(role, "giving.amounts");

/** R13.1, R13.9, R13.10. Who runs the giving: the funds, the batches, Stripe. */
export const CAN_MANAGE_GIVING: readonly TenantRole[] = rolesWith("giving.manage");

export const canManageGiving = (role: Who): boolean => can(role, "giving.manage");

/**
 * R2.x writes. Who may change a person's record.
 *
 * Staff can edit, because a church with two paid staff cannot route every
 * correction through the Owner. Archiving is narrower: it removes someone from
 * every list at once, so it stays with Owner and Admin.
 */
export const CAN_EDIT_PEOPLE: readonly TenantRole[] = rolesWith("members.edit");
export const CAN_ARCHIVE_PEOPLE: readonly TenantRole[] = rolesWith("members.archive");

/** R2.1. Who may name, merge and put away a household. */
export const CAN_MANAGE_HOUSEHOLDS: readonly TenantRole[] = rolesWith("members.households");

export const canEditPeople = (role: Who): boolean => can(role, "members.edit");
export const canArchivePeople = (role: Who): boolean => can(role, "members.archive");
export const canManageHouseholds = (role: Who): boolean => can(role, "members.households");

/**
 * Thrown when a role is not permitted to perform a write.
 *
 * Writes are refused in the repository, not in the page, for the same reason
 * reads are filtered there: a check that lives in a template is a check that the
 * next caller forgets. A page hiding the edit button is courtesy. This is the
 * control.
 */
export class PermissionError extends Error {
  readonly role: TenantRole;
  /** The catalogue key naming the refused action, such as "archivePerson". */
  readonly action: PermissionAction;
  constructor(role: TenantRole, action: PermissionAction) {
    super(t("error.permission", { role, action: t(`error.permission.${action}`) }));
    this.name = "PermissionError";
    this.role = role;
    this.action = action;
  }
}

/** Every action a role can be refused. Adding one without a message will not compile. */
export type PermissionAction =
  | "addPerson" | "editPerson" | "archivePerson" | "restorePerson"
  | "createTag" | "renameTag" | "recolourTag" | "deleteTag" | "mergeTags" | "tagPerson"
  | "addField" | "editField" | "deleteField" | "setFieldValue"
  | "rollbackImport" | "exportEverything" | "mergePeople"
  | "editRelationship" | "liftDoNotContact"
  | "addMilestone" | "removeMilestone"
  | "editChurch" | "manageDemoData" | "manageServices" | "recordAttendance"
  | "manageRooms" | "manageStations" | "checkIn"
  | "fileIncident" | "readIncidents" | "manageGroups" | "recordGroupAttendance"
  | "manageEvents"
  | "manageFollowUps" | "editPipelines" | "seeChecks" | "editDirectoryPrivacy"
  | "manageTeams" | "manageTeamRoster" | "schedule" | "managePlans"
  | "manageForms" | "editRoles" | "manageHouseholds" | "buildReports"
  | "manageGiving" | "recordGift";
