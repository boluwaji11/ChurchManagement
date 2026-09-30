import { check, email as validEmail, requiredValue } from "@hearth/ui";
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

export const LIFECYCLE_OPTIONS = [
  { value: "visitor", label: "Visitor" },
  { value: "regular_attender", label: "Regular attender" },
  { value: "member", label: "Member" },
  { value: "inactive", label: "Inactive" },
  { value: "deceased", label: "Deceased" },
] as const;

export const HOUSEHOLD_ROLE_OPTIONS = [
  { value: "head", label: "Head of household" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
] as const;

/** The value the household picker uses to mean "start a new one". */
export const HOUSEHOLD_NEW = "__new";
export const HOUSEHOLD_NONE = "__none";

/**
 * Keyed by the input's name, so a message finds its field without a lookup table.
 * Custom fields are keyed `cf_<id>`, which is why this is not a closed union.
 */
export type PersonErrors = Record<string, string | undefined>;

const str = (data: FormData, key: string): string => String(data.get(key) ?? "").trim();

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
    email: str(data, "email") || null,
    phone: str(data, "phone") || null,
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
  if (Number.isNaN(parsed)) return `Check ${what}. Use the date picker or type it as YYYY-MM-DD.`;
  if (!allowFuture && value > today()) return `${what} cannot be in the future.`;
  if (value < "1900-01-01") return `Check ${what}. That year looks like a typo.`;
  return undefined;
}

/** Phone numbers are global and messy. Reject only what cannot be a number at all. */
function phoneProblem(value: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "That phone number looks too short. Include the area code.";
  if (!/^[\d\s()+.\-]+$/.test(value)) return "Phone numbers take digits, spaces, and + ( ) . - only.";
  return undefined;
}

export function personErrors(input: PersonInput & { householdChoice?: string }): PersonErrors {
  const errors: PersonErrors = {};

  const first = check(input.firstName, requiredValue("a first name"));
  if (first) errors.firstName = first;

  const last = check(input.lastName, requiredValue("a surname"));
  if (last) errors.lastName = last;

  // Email is optional here, unlike at sign-in. A child has no email address.
  if (input.email) {
    const problem = check(input.email, validEmail);
    if (problem) errors.email = problem;
  }

  const phone = phoneProblem(input.phone ?? null);
  if (phone) errors.phone = phone;

  const dob = dateProblem(input.dateOfBirth ?? null, "the date of birth");
  if (dob) errors.dateOfBirth = dob;

  const joined = dateProblem(input.membershipDate ?? null, "the membership date");
  if (joined) errors.membershipDate = joined;

  const visit = dateProblem(input.firstVisitOn ?? null, "the first visit");
  if (visit) errors.firstVisitOn = visit;

  if (input.householdChoice === HOUSEHOLD_NEW && !(input.householdName ?? "").trim()) {
    errors.householdName = "Name the household, for example \"The Bennett family\".";
  }

  return errors;
}

export const hasErrors = (errors: PersonErrors): boolean =>
  Object.values(errors).some(Boolean);
