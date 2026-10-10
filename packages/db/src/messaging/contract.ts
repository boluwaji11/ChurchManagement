/**
 * HRT-286, HRT-287, R16.1, R16.2. What every messaging provider has to answer.
 *
 * One interface, so the screens never learn a vendor's name. Resend and Twilio
 * are two implementations of this and a church's own SMTP server is a third,
 * and the difference between them belongs in the worker rather than on the
 * screen a volunteer reads.
 *
 * Nothing in this file calls anybody. It is the shape the vendors are held to,
 * written before the accounts exist so that the first vendor does not get to
 * decide what the second one looks like.
 *
 * The church owns every account and pays every bill. Each method here acts as
 * the church, against credentials the church gave us.
 */

export const CHANNELS = ["email", "sms"] as const;
export type Channel = (typeof CHANNELS)[number];

export const VENDORS = ["resend", "twilio", "smtp"] as const;
export type Vendor = (typeof VENDORS)[number];

/** Which vendors can carry which channel. */
export const VENDOR_CHANNEL: Record<Vendor, Channel> = {
  resend: "email",
  smtp: "email",
  twilio: "sms",
};

/**
 * R16.2. How far a registration has got.
 *
 * `in_review` is the state the narrative version of this product does not
 * have, and it is the one a church actually sits in. A carrier takes days.
 */
export const REGISTRATION_STATES = [
  "draft", "submitted", "in_review", "approved", "rejected",
] as const;
export type RegistrationState = (typeof REGISTRATION_STATES)[number];

export const REGISTRATION_KINDS = ["brand", "campaign"] as const;
export type RegistrationKind = (typeof REGISTRATION_KINDS)[number];

/**
 * R16.2. What may follow what.
 *
 * A refusal is not the end: a church fixes what the carrier objected to and
 * submits again, so `rejected` leads back to `draft`. An approval is final
 * until somebody disconnects the account, which takes the whole row with it.
 */
const NEXT: Record<RegistrationState, readonly RegistrationState[]> = {
  draft: ["submitted"],
  submitted: ["in_review", "approved", "rejected"],
  in_review: ["approved", "rejected"],
  approved: [],
  rejected: ["draft"],
};

export const canMoveTo = (from: RegistrationState, to: RegistrationState): boolean =>
  NEXT[from].includes(to);

/** The states a church is waiting through rather than acting on. */
export const isWaiting = (state: RegistrationState): boolean =>
  state === "submitted" || state === "in_review";

/**
 * R16.8. Whether this registration can honestly be submitted.
 *
 * The carrier's form asks how people opted in. A church that has recorded no
 * consent has no answer, and submitting anyway is asking the church to write
 * something untrue on a compliance form. So the check is here, in front of the
 * submission, rather than in a help article nobody reads.
 */
export interface SubmissionReadiness {
  ready: boolean;
  /** Catalogue keys, so the screen says these in the church's own language. */
  missing: string[];
}

export function readyToSubmit(input: {
  kind: RegistrationKind;
  /** The church's registered number, which the carrier asks for by law. */
  taxId: string | null | undefined;
  legalName: string | null | undefined;
  /** A registered address, as its own government has it. */
  hasAddress: boolean;
  /** How many of the congregation have agreed to be texted. */
  consented: number;
  /** Whether the brand this campaign hangs off has been approved. */
  brandApproved: boolean;
}): SubmissionReadiness {
  const missing: string[] = [];

  if (!input.legalName?.trim()) missing.push("messaging.missing.legalName");
  if (!input.taxId?.trim()) missing.push("messaging.missing.taxId");
  if (!input.hasAddress) missing.push("messaging.missing.address");

  if (input.kind === "campaign") {
    if (!input.brandApproved) missing.push("messaging.missing.brand");
    // R16.8. The question the carrier actually asks.
    if (input.consented === 0) missing.push("messaging.missing.consent");
  }

  return { ready: missing.length === 0, missing };
}

/** R16.8. Whether somebody may be contacted on a channel. */
export const CONSENT_STATES = ["granted", "withdrawn", "unknown"] as const;
export type ConsentState = (typeof CONSENT_STATES)[number];

export const CONSENT_SOURCES = ["form", "paper", "verbal", "import", "portal"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/**
 * R16.8. Consent that would stand up if anybody asked.
 *
 * An import is the case this exists for. Four hundred rows arriving from a
 * spreadsheet are four hundred people nobody asked, so an imported row is
 * recorded as consent of a kind that does not count for a text message. It is
 * enough for the transactional mail a church already owes somebody, and it is
 * not enough to put them on a list.
 */
export function mayContact(input: {
  channel: Channel;
  state: ConsentState;
  source: ConsentSource | null | undefined;
  /** Something the church owes this person, as against something it is sending out. */
  transactional: boolean;
}): boolean {
  // Withdrawn stops everything, including what the church owes them: somebody
  // who asked to be left alone has asked to be left alone.
  if (input.state === "withdrawn") return false;
  // A receipt, a statement, a password reset. Owed rather than sent out.
  if (input.transactional) return true;
  if (input.state !== "granted") return false;
  // A text needs consent somebody actually gave.
  if (input.channel === "sms" && input.source === "import") return false;
  return true;
}

/**
 * What a provider has to be able to do. No implementation lives in this
 * package: the worker holds those, and it is the only place a credential is
 * ever opened.
 */
export interface MessagingProvider {
  readonly vendor: Vendor;
  readonly channel: Channel;

  /** Turn whatever the church authorised into a credential we can seal. */
  connect(grant: { code: string; redirectUri: string }): Promise<{
    externalAccountId: string;
    credential: string;
  }>;

  /** Ask the vendor whether the credential still works. */
  verify(credential: string): Promise<{ ok: boolean; error?: string }>;

  /** Hand the vendor the church's details and get back where it has got to. */
  register(
    credential: string,
    input: { kind: RegistrationKind; legalName: string; taxId: string },
  ): Promise<{ externalId: string; state: RegistrationState }>;

  /** Ask again, because the answer arrives days later. */
  registrationState(
    credential: string,
    externalId: string,
  ): Promise<{ state: RegistrationState; rejectionCode?: string; rejectionDetail?: string }>;
}
