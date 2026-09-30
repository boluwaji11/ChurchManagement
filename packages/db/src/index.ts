export * as schema from "./schema/index";
export { owner, appDb, withTenant, closeConnections, sql, type Db, type Tx, type TenantContext } from "./client";
export {
  TENANT_ROLES, type TenantRole, canReadConfidentialNotes, canReadGivingAmounts,
  CAN_READ_CONFIDENTIAL_NOTES, CAN_READ_GIVING_AMOUNTS,
} from "./roles";
export { encryptNote, decryptNote } from "./crypto";
export {
  listPeople, getPerson, countPeopleByStatus, listTags, listTagsForPerson,
  resolveTenantBySlug, listChurches, type PersonRow,
} from "./repo/people";
export { listNotesForPerson, createNote, type NoteView } from "./repo/notes";
export {
  membershipsForUser, verifyMembership, syncUserAndAcceptInvitations,
  createInvitation, revokeInvitation, type Membership,
} from "./repo/membership";
export { loadEnv } from "./env";
