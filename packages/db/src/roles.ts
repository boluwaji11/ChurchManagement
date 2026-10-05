import { t } from "@hearth/i18n";
import { can, rolesWith, type TenantRole, type Who } from "./permissions";

export {
  TENANT_ROLES, PERMISSIONS, ROLE_PERMISSIONS, can, rolesWith,
  type TenantRole, type Permission,
} from "./permissions";

/**
 * R1.5 and R21.2. Field-level permissions, enforced here at the query layer
 * rather than in a template. If data is hidden only by the view, it is not
 * hidden, so every repository assumes its consumer is the API.
 */
export const CAN_READ_CONFIDENTIAL_NOTES: readonly TenantRole[] = rolesWith("people.notes.confidential");

/** Giving amounts arrive in 0.3. The rule is recorded now so it is not forgotten. */
export const CAN_READ_GIVING_AMOUNTS: readonly TenantRole[] = rolesWith("giving.amounts");

export const canReadConfidentialNotes = (role: Who): boolean =>
  can(role, "people.notes.confidential");

export const canReadGivingAmounts = (role: Who): boolean =>
  can(role, "giving.amounts");

/**
 * R2.x writes. Who may change a person's record.
 *
 * Staff can edit, because a church with two paid staff cannot route every
 * correction through the Owner. Archiving is narrower: it removes someone from
 * every list at once, so it stays with Owner and Admin.
 */
export const CAN_EDIT_PEOPLE: readonly TenantRole[] = rolesWith("people.edit");
export const CAN_ARCHIVE_PEOPLE: readonly TenantRole[] = rolesWith("people.archive");

/** R2.1. Who may name, merge and put away a household. */
export const CAN_MANAGE_HOUSEHOLDS: readonly TenantRole[] = rolesWith("people.households");

export const canEditPeople = (role: Who): boolean => can(role, "people.edit");
export const canArchivePeople = (role: Who): boolean => can(role, "people.archive");
export const canManageHouseholds = (role: Who): boolean => can(role, "people.households");

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
  | "manageForms" | "editRoles" | "manageHouseholds" | "buildReports";
