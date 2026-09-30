export * as schema from "./schema/index";
export { owner, appDb, withTenant, closeConnections, sql, type Db, type Tx, type TenantContext } from "./client";
export {
  TENANT_ROLES, type TenantRole, canReadConfidentialNotes, canReadGivingAmounts,
  CAN_READ_CONFIDENTIAL_NOTES, CAN_READ_GIVING_AMOUNTS,
  canEditPeople, canArchivePeople, CAN_EDIT_PEOPLE, CAN_ARCHIVE_PEOPLE, PermissionError,
} from "./roles";
export { encryptNote, decryptNote } from "./crypto";
export {
  listPeople, getPerson, countPeopleByStatus, listTags, listTagsForPerson,
  resolveTenantBySlug, listChurches, type PersonRow,
  createPerson, updatePerson, setPersonArchived, getPersonForEdit, listHouseholds,
  LIFECYCLE_STATUSES, HOUSEHOLD_ROLES,
  type LifecycleStatus, type HouseholdRole, type PersonInput, type PersonEditValues, type WriteActor,
} from "./repo/people";
export {
  listTagsWithCounts, createTag, renameTag, setTagHue, deleteTag, mergeTags, setPersonTag,
  canManageTags, CAN_MANAGE_TAGS, NameTakenError, normaliseTagName, TAG_HUES,
  type TagRow, type TagHue,
} from "./repo/tags";
export { listNotesForPerson, createNote, type NoteView } from "./repo/notes";
export {
  membershipsForUser, verifyMembership, syncUserAndAcceptInvitations,
  createInvitation, revokeInvitation, type Membership,
} from "./repo/membership";
export { loadEnv } from "./env";
