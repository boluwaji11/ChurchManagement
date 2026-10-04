import { t } from "@hearth/i18n";
import { check, email as validEmail, requiredValue } from "./validate";
import type { PersonInput, LifecycleStatus, HouseholdRole } from "@hearth/db";

/**
 * One definition of a valid person, used by the form in the browser and again by
 * the server action.
 *
 * The browser copy exists so the answer is instant. The server copy exists
 * because the browser copy can be bypassed with a single line of JavaScript.
 * Sharing the module is what stops the two drifting apart, which is the failure
 * mode where a field is rejected with a message nobody can act on.
 */

export const LIFECYCLE_VALUES = [
  "visitor", "regular_attender", "member", "inactive", "deceased",
] as const;

export const lifecycleOptions = () =>
  LIFECYCLE_VALUES.map((value) => ({ value, label: t(`lifecycle.${value}`) }));

/** Every status the database can hold, including the ones the form does not offer. */
const LIFECYCLE_LABELLED = [...LIFECYCLE_VALUES, "archived"] as const;
type LabelledStatus = (typeof LIFECYCLE_LABELLED)[number];

const isLabelled = (status: string): status is LabelledStatus =>
  (LIFECYCLE_LABELLED as readonly string[]).includes(status);

/**
 * The label for a status that arrived as a plain string from the database.
 * An unknown value renders itself rather than a blank, so a new enum member
 * shows up as a slightly ugly word instead of an empty cell.
 */
export const lifecycleLabel = (status: string): string =>
  isLabelled(status) ? t(`lifecycle.${status}`) : status;

export const HOUSEHOLD_ROLE_VALUES = ["head", "spouse", "child", "other"] as const;

export const householdRoleOptions = () =>
  HOUSEHOLD_ROLE_VALUES.map((value) => ({ value, label: t(`householdRole.${value}`) }));

/** The value the household picker uses to mean "start a new one". */
export const HOUSEHOLD_NEW = "__new";
export const HOUSEHOLD_NONE = "__none";

/**
 * Keyed by the input's name, so a message finds its field without a lookup table.
 * Custom fields are keyed `cf_<id>`, which is why this is not a closed union.
 */
export type PersonErrors = Record<string, string | undefined>;

const str = (data: FormData, key: string): string => String(data.get(key) ?? "").trim();

/** A picker's value, where its "they have not said" answer means null. */
const pick = (data: FormData, key: string): string | null => {
  const value = str(data, key);
  return value && value !== UNSAID ? value : null;
};

/** Reads the form into the shape the repository takes. Never throws. */
export function parsePerson(data: FormData): PersonInput & { householdChoice: string } {
  const householdChoice = str(data, "householdId") || HOUSEHOLD_NONE;
  return {
    firstName: str(data, "firstName"),
    lastName: str(data, "lastName"),
    preferredName: str(data, "preferredName") || null,
    dateOfBirth: str(data, "dateOfBirth") || null,
    lifecycleStatus: (str(data, "lifecycleStatus") || "visitor") as LifecycleStatus,
    membershipDate: str(data, "membershipDate") || null,
    firstVisitOn: str(data, "firstVisitOn") || null,
    allergies: str(data, "allergies") || null,
    medicalNote: str(data, "medicalNote") || null,
    email: str(data, "email") || null,
    phone: str(data, "phone") || null,
    address: {
      line1: str(data, "addressLine1") || null,
      line2: str(data, "addressLine2") || null,
      city: str(data, "addressCity") || null,
      region: str(data, "addressRegion") || null,
      postalCode: str(data, "addressPostalCode") || null,
    },
    campusId: str(data, "campusId") || null,
    maritalStatus: pick(data, "maritalStatus"),
    schoolLevel: pick(data, "schoolLevel"),
    householdId: householdChoice === HOUSEHOLD_NEW || householdChoice === HOUSEHOLD_NONE ? null : householdChoice,
    householdName: householdChoice === HOUSEHOLD_NEW ? str(data, "householdName") || null : null,
    householdRole: (str(data, "householdRole") || "other") as HouseholdRole,
    householdChoice,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Dates come from a date input, so the format is already right. What a date input
 * will not stop is 1823 or next Thursday, and a birthday typed as 2026 instead of
 * 1926 is the single most common piece of bad data in a church directory.
 */
function dateProblem(value: string | null, what: string, allowFuture = false): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return t("validate.date.malformed", { what });
  if (!allowFuture && value > today()) return t("validate.date.future", { what });
  if (value < "1900-01-01") return t("validate.date.tooEarly", { what });
  return undefined;
}

/** Phone numbers are global and messy. Reject only what cannot be a number at all. */
function phoneProblem(value: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return t("validate.phone.short");
  if (!/^[\d\s()+.\-]+$/.test(value)) return t("validate.phone.characters");
  return undefined;
}

export function personErrors(input: PersonInput & { householdChoice?: string }): PersonErrors {
  const errors: PersonErrors = {};

  const first = check(input.firstName, requiredValue(t("validate.firstName")));
  if (first) errors.firstName = first;

  const last = check(input.lastName, requiredValue(t("validate.lastName")));
  if (last) errors.lastName = last;

  // Email is optional here, unlike at sign-in. A child has no email address.
  if (input.email) {
    const problem = check(input.email, validEmail);
    if (problem) errors.email = problem;
  }

  const phone = phoneProblem(input.phone ?? null);
  if (phone) errors.phone = phone;

  const dob = dateProblem(input.dateOfBirth ?? null, t("validate.date.dateOfBirth"));
  if (dob) errors.dateOfBirth = dob;

  const joined = dateProblem(input.membershipDate ?? null, t("validate.date.membershipDate"));
  if (joined) errors.membershipDate = joined;

  const visit = dateProblem(input.firstVisitOn ?? null, t("validate.date.firstVisit"));
  if (visit) errors.firstVisitOn = visit;

  if (input.householdChoice === HOUSEHOLD_NEW && !(input.householdName ?? "").trim()) {
    errors.householdName = t("validate.householdName");
  }

  return errors;
}

export const hasErrors = (errors: PersonErrors): boolean =>
  Object.values(errors).some(Boolean);

/**
 * R2.1. The answers a church writes down for marital status.
 *
 * A closed list rather than free text, because "married" and "Married" being
 * two answers makes a count of either one wrong.
 */
export const MARITAL_VALUES = [
  "single", "married", "engaged", "widowed", "divorced", "separated",
] as const;

export const maritalOptions = () =>
  MARITAL_VALUES.map((value) => ({ value, label: t(`marital.${value}`) }));

/**
 * R2.1. Pre-K through graduate school.
 *
 * Grades are named one by one rather than grouped, because a children's
 * ministry puts a fourth grader in a different room from a fifth grader, and a
 * band called "elementary" cannot answer that.
 */
export const SCHOOL_VALUES = [
  "pre_k", "kindergarten",
  "grade_1", "grade_2", "grade_3", "grade_4", "grade_5", "grade_6",
  "grade_7", "grade_8", "grade_9", "grade_10", "grade_11", "grade_12",
  "college", "graduate",
] as const;

export const schoolOptions = () =>
  SCHOOL_VALUES.map((value) => ({ value, label: t(`school.${value}`) }));

/** The value a picker uses to mean "they have not said". */
export const UNSAID = "__unsaid";
