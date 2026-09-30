export * as schema from "./schema/index";
export { owner, appDb, withTenant, closeConnections, sql, type Db, type Tx, type TenantContext } from "./client";
export {
  TENANT_ROLES, type TenantRole, canReadConfidentialNotes, canReadGivingAmounts,
  CAN_READ_CONFIDENTIAL_NOTES, CAN_READ_GIVING_AMOUNTS,
  canEditPeople, canArchivePeople, CAN_EDIT_PEOPLE, CAN_ARCHIVE_PEOPLE, PermissionError,
} from "./roles";
export { InvalidInputError, NameTakenError } from "./errors";
export { encryptNote, decryptNote } from "./crypto";
export {
  listPeople, getPerson, countPeopleByStatus, listTags, listTagsForPerson,
  resolveTenantBySlug, listChurches, type PersonRow,
  createPerson, updatePerson, setPersonArchived, getPersonForEdit, listHouseholds,
  bulkSetArchived, bulkSetStatus, countPeople, PER_PAGE, type DirectoryQuery,
  LIFECYCLE_STATUSES, HOUSEHOLD_ROLES,
  type LifecycleStatus, type HouseholdRole, type PersonInput, type PersonEditValues, type WriteActor,
} from "./repo/people";
export {
  listTagsWithCounts, createTag, renameTag, setTagHue, deleteTag, mergeTags, setPersonTag,
  canManageTags, CAN_MANAGE_TAGS, normaliseTagName, TAG_HUES, bulkSetPersonTag,
  type TagRow, type TagHue,
} from "./repo/tags";
export {
  listCustomFields, createCustomField, updateCustomField, deleteCustomField,
  getCustomValues, setCustomValues, coerceCustomValue, canManageCustomFields, keyFor,
  CAN_MANAGE_CUSTOM_FIELDS, CUSTOM_FIELD_TYPES, CUSTOM_FIELD_ENTITIES,
  type CustomFieldDef, type CustomFieldType, type CustomFieldEntity, type CustomValue,
} from "./repo/custom-fields";
export {
  mergePeople, undoMerge, listMerges, findDuplicatePairs, MERGE_UNDO_WINDOW_DAYS,
  type MergePlan, type MergeResult, type MergeSummary, type DuplicatePair,
} from "./repo/merge";
export * from "./repo/relationships";
export * from "./repo/milestones";
export * from "./repo/church";
export * from "./repo/services";
export * from "./repo/sessions";
export * from "./repo/storage";
export * from "./demo/load";
export * from "./demo/church";
export { DEMO_PEOPLE, DEMO_TAGS } from "./demo/people";
export { listNotesForPerson, createNote, type NoteView } from "./repo/notes";
export {
  membershipsForUser, verifyMembership, syncUserAndAcceptInvitations,
  createInvitation, revokeInvitation, createChurch, slugify, isKnownTimezone,
  RESERVED_SLUGS, type Membership,
} from "./repo/membership";
export { readSheet, readImportFile, parseDelimited, detectDelimiter, type Sheet } from "./import/csv";
export { readWorkbook, isWorkbookName } from "./import/xlsx";
export {
  PERSON_FIELDS, IGNORE, guessMapping, parseImportedDate, parseLifecycle, parseHouseholdRole,
  type TargetField,
} from "./import/columns";
export {
  buildMatchIndex, indexPeople, findMatches, indexNewPerson,
  normaliseName, normaliseEmail, normalisePhone, type ExistingPerson,
  type Match, type MatchIndex, type Candidate, type Confidence,
} from "./import/match";
export {
  plan, commit, type Plan, type PlannedRow, type DuplicateStrategy, type CommitResult,
} from "./import/run";
export {
  listImports, rollbackImport, ROLLBACK_WINDOW_DAYS,
  type BatchSummary, type RollbackResult,
} from "./import/rollback";
export { buildArchive, ARCHIVE_FORMAT, EXPORT_TABLES, type Archive, type ExportTable } from "./export/archive";
export { zipArchive } from "./export/zip";
export { toCsv, CSV_BOM } from "./export/csv";
export { withAuditTriggersOff, deleteTenants, deleteTenantsLike } from "./maintenance";
export { loadEnv } from "./env";
