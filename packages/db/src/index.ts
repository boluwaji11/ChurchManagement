export * as schema from "./schema/index";
export { owner, appDb, withTenant, closeConnections, sql, type Db, type Tx, type TenantContext } from "./client";
export {
  TENANT_ROLES, type TenantRole, PERMISSIONS, ROLE_PERMISSIONS, type Permission,
  can, rolesWith, canReadConfidentialNotes, canReadGivingAmounts,
  canManageHouseholds, CAN_MANAGE_HOUSEHOLDS,
  CAN_READ_CONFIDENTIAL_NOTES, CAN_READ_GIVING_AMOUNTS,
  canEditPeople, canArchivePeople, CAN_EDIT_PEOPLE, CAN_ARCHIVE_PEOPLE, PermissionError,
} from "./roles";
export {
  listRoles, createRole, renameRole, setPermissions, archiveRole,
  permissionsFor, ensureBuiltIns, type ChurchRole,
} from "./repo/tenant-roles";
export {
  listHouseholdRows, renameHousehold, setHouseholdArchived, mergeHouseholds,
  type HouseholdRow,
} from "./repo/households";
export { InvalidInputError, NameTakenError } from "./errors";
export { encryptNote, decryptNote } from "./crypto";
export {
  listPeople, getPerson, countPeopleByStatus, listTags, listTagsForPerson,
  resolveTenantBySlug, listChurches, type PersonRow,
  createPerson, updatePerson, setPersonArchived, getPersonForEdit, listHouseholds,
  type HouseholdOption,
  bulkSetArchived, bulkSetStatus, countPeople, householdFor, addressFor, addressesFor, PER_PAGE,
  type DirectoryQuery, type HouseholdCard,
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
export * from "./repo/label-layout";
export * from "./repo/campuses";
export * from "./repo/provisional";
export * from "./repo/public-groups";
export * from "./repo/forms";
export * from "./repo/services";
export * from "./repo/attendance";
export * from "./repo/rooms";
export * from "./repo/stations";
export * from "./repo/lookup";
export * from "./repo/checkin";
export * from "./repo/offline";
export * from "./repo/roster";
export * from "./repo/supervisor";
export * from "./repo/incidents";
export * from "./repo/groups";
export * from "./repo/followups";
export * from "./repo/checks";
export * from "./repo/celebrations";
export * from "./repo/serving";
export * from "./repo/schedule";
export * from "./repo/respond";
export * from "./repo/plans";
export * from "./repo/plan-templates";
export * from "./repo/live";
export * from "./repo/plan-history";
export * from "./repo/directory";
export * from "./repo/setup";
export * from "./repo/value";
export * from "./repo/directory-rules";
export * from "./repo/check-rules";
export * from "./repo/scope";
export * from "./repo/group-attendance";
export * from "./repo/group-finder";
export * from "./repo/meeting-dates";
export * from "./repo/match";
export * from "./repo/checkout";
export * from "./repo/which-service";
export * from "./repo/sessions";
export * from "./repo/storage";
export * from "./demo/load";
export * from "./demo/church";
export { DEMO_PEOPLE, DEMO_TAGS } from "./demo/people";
export { listNotesForPerson, createNote, type NoteView } from "./repo/notes";
export {
  personTimeline, TIMELINE_LIMIT,
  type TimelineEntry, type TimelineKind,
} from "./repo/timeline";
export {
  listSavedLists, getSavedList, createStaticList, createRuleList, renameList,
  setListArchived, addToList, removeFromList, resolveList, listsForPerson,
  cleanRule, RULE_KEYS,
  type SavedList, type ListRule, type RuleKey,
} from "./repo/lists";
export {
  membershipsForUser, verifyMembership, syncUserAndAcceptInvitations,
  createInvitation, revokeInvitation, createChurch, slugify, isKnownTimezone,
  listTeam, listInvitations, setMemberRole, removeMember,
  RESERVED_SLUGS,
  type Membership, type TeamMember, type PendingInvitation,
} from "./repo/membership";
export {
  churchForJoinCode, joinWithCode, rotateJoinCode, closeJoining,
  normaliseJoinCode, formatJoinCode,
  type JoinTarget, type JoinOutcome,
} from "./repo/joining";
export { readSheet, readImportFile, parseDelimited, detectDelimiter, type Sheet } from "./import/csv";
export {
  GROUP_FIELDS, isGroupSheet, guessGroupMapping, parseGroupRole,
} from "./import/group-columns";
export {
  planGroups, commitGroups, rollbackGroupImport,
  type GroupPlan, type PlannedGroupRow, type GroupCommitResult,
} from "./import/run-groups";
export {
  IMPORT_SOURCES, SOURCE_KEYS, detectSource, sourceMapping,
  type SourceKey, type ImportSource,
} from "./import/sources";
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
export * from "./repo/notifications";
