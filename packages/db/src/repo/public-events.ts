import { randomUUID } from "node:crypto";
import { owner } from "../client";
import { InvalidInputError } from "../errors";
import {
  checkSubmission, prunedAnswers,
  type ConditionOp, type FormAnswer, type FormFieldDef, type FormFieldKind,
} from "./form-rules";
import { publicChurch, type PublicChurch } from "./public-groups";
import { placeSubmission } from "./form-matching";

/**
 * R14.2, R14.4, R14.6. An event as somebody with no account meets it.
 *
 * A church puts the link on its own website or in a bulletin, and whoever
 * follows it reads what the event is and takes a place without signing in.
 *
 * Runs on the owner connection for the same reason the public groups and forms
 * do: there is no session to set a tenant from, so every statement carries its
 * own tenant predicate and names its columns by hand.
 */

export type PublicEventState =
  /** An announcement. Nobody signs up, and the page is the whole of it. */
  | "none"
  /** Taking registrations. */
  | "open"
  /** Full, and taking names for a waiting list. */
  | "waitlist"
  /** Full, and not taking names. */
  | "full"
  /** The church closed it, or the closing date has passed. */
  | "closed"
  /** The church called the event off. */
  | "cancelled";

export interface PublicEvent {
  church: PublicChurch;
  id: string;
  name: string;
  description: string | null;
  hue: string;
  coverKey: string | null;
  startsOn: string;
  startsAt: string | null;
  endsOn: string | null;
  endsAt: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  capacity: number | null;
  going: number;
  state: PublicEventState;
  /** R14.4. Whether this page says how many places are left. */
  showCapacity: boolean;
  /** R14.5. The questions each registrant answers, empty when there are none. */
  questions: FormFieldDef[];
  /** R14.5. The public slug of the form registration goes through, if any. */
  formSlug: string | null;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

interface Row {
  id: string;
  tenantId: string;
  formId: string | null;
  name: string;
  description: string | null;
  hue: string;
  coverKey: string | null;
  startsOn: string;
  startsAt: string | null;
  endsOn: string | null;
  endsAt: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  status: string;
  formSlug: string | null;
  takesRegistrations: boolean;
  registrationOpen: boolean;
  registrationClosesOn: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  showCapacity: boolean;
  waitlist: boolean;
  going: number;
}

async function eventRow(
  churchSlug: string,
  eventSlug: string,
  /** R14.2. Only the church's own preview reads a draft, and only to try it. */
  includeDrafts = false,
): Promise<Row | null> {
  if (!SLUG.test(churchSlug) || !SLUG.test(eventSlug)) return null;

  const rows = await owner()<Row[]>`
    select e.id,
           e.tenant_id as "tenantId",
           e.form_id as "formId",
           (select f.slug from forms f
             where f.id = e.form_id and f.archived_at is null) as "formSlug",
           e.name,
           e.description,
           e.hue::text as hue,
           e.cover_key as "coverKey",
           to_char(e.starts_on, 'YYYY-MM-DD') as "startsOn",
           e.starts_at as "startsAt",
           to_char(e.ends_on, 'YYYY-MM-DD') as "endsOn",
           e.ends_at as "endsAt",
           e.location,
           e.address_line1 as "addressLine1",
           e.address_line2 as "addressLine2",
           e.city,
           e.region,
           e.postal_code as "postalCode",
           e.country,
           e.status,
           e.takes_registrations as "takesRegistrations",
           e.registration_open as "registrationOpen",
           to_char(e.registration_closes_on, 'YYYY-MM-DD') as "registrationClosesOn",
           e.registration_closes_at as "registrationClosesAt",
           e.capacity,
           e.show_capacity as "showCapacity",
           e.waitlist,
           (select count(*) from event_registrations r
             where r.event_id = e.id and r.state = 'going')::int as going
      from events e
      join tenants t on t.id = e.tenant_id
     where t.slug = ${churchSlug}
       and t.approved_at is not null
       and t.demo_expires_at is null
       and e.slug = ${eventSlug}
       and e.archived_at is null
       and e.listed
       and (${includeDrafts} or e.status <> 'draft')
     limit 1`;
  return rows[0] ?? null;
}

/**
 * R14.4. Whether somebody can take a place, and what happens if they try.
 *
 * `today` is the church's own date rather than the server's, so an event that
 * closes on the 6th is open all of the 6th wherever the reader is.
 */
function stateOf(row: Row, today: string, now: string): PublicEventState {
  if (row.status === "cancelled") return "cancelled";
  // Asked before anything about dates or places, because none of those mean
  // anything on an event nobody signs up for.
  if (!row.takesRegistrations) return "none";
  if (!row.registrationOpen) return "closed";

  if (row.registrationClosesOn) {
    if (row.registrationClosesOn < today) return "closed";
    // On the closing day itself, a time closes it at that time. With no time,
    // "closes on the 6th" means the whole of the 6th.
    if (
      row.registrationClosesOn === today
      && row.registrationClosesAt
      && now > row.registrationClosesAt
    ) {
      return "closed";
    }
  }

  const last = row.endsOn ?? row.startsOn;
  if (last < today) return "closed";

  if (row.capacity !== null && row.going >= row.capacity) {
    return row.waitlist ? "waitlist" : "full";
  }
  return "open";
}

async function questionRows(formId: string | null): Promise<FormFieldDef[]> {
  if (!formId) return [];

  const rows = await owner()<{
    id: string;
    kind: string;
    label: string;
    help: string | null;
    required: boolean;
    options: string[] | null;
    position: number;
    showWhenFieldId: string | null;
    showWhenOp: string | null;
    showWhenValue: string | null;
    mapsTo: string | null;
  }[]>`
    select id, kind, label, help, required, options, position,
           show_when_field_id as "showWhenFieldId",
           show_when_op as "showWhenOp",
           show_when_value as "showWhenValue",
           maps_to as "mapsTo"
      from form_fields
     where form_id = ${formId}
     order by position, created_at`;

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as FormFieldKind,
    label: row.label,
    help: row.help,
    required: row.required,
    options: row.options,
    position: row.position,
    mapsTo: row.mapsTo,
    showWhen: row.showWhenFieldId && row.showWhenOp
      ? {
          fieldId: row.showWhenFieldId,
          op: row.showWhenOp as ConditionOp,
          value: row.showWhenValue,
        }
      : null,
  }));
}

/** R14.2. The event behind a public link, with its questions. */
export async function publicEvent(
  churchSlug: string,
  eventSlug: string,
  today: string,
  now: string,
): Promise<PublicEvent | null> {
  const church = await publicChurch(churchSlug);
  if (!church) return null;

  const row = await eventRow(churchSlug, eventSlug);
  if (!row) return null;

  return {
    church,
    id: row.id,
    name: row.name,
    description: row.description,
    hue: row.hue,
    coverKey: row.coverKey,
    startsOn: row.startsOn,
    startsAt: row.startsAt,
    endsOn: row.endsOn,
    endsAt: row.endsAt,
    location: row.location,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    region: row.region,
    postalCode: row.postalCode,
    country: row.country,
    capacity: row.capacity,
    showCapacity: row.showCapacity,
    going: row.going,
    state: stateOf(row, today, now),
    formSlug: row.formSlug,
    questions: await questionRows(row.formId),
  };
}

/** R14.6. One person on a booking: who they are, and what they answered. */
export interface Registrant {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  answers: Record<string, FormAnswer>;
}

export type RegisterResult =
  | { ok: true; going: number; waiting: number }
  /** R14.9. Which answers came back wrong, by position in the party. */
  | { ok: false; errors: { at: number; fieldId: string; message: string }[] };

const PARTY_LIMIT = 20;

/**
 * R14.2, R14.4, R14.6. Takes a party's places at an event.
 *
 * A parent registering three children and themselves is one booking of four
 * rows, which is what a roster reads and what an emergency contact sheet
 * prints. Everybody on it is matched to a person record the same way a form
 * submission is (R4.4).
 *
 * Capacity is read under a lock, so the last two places cannot both go to a
 * party of two arriving at once. A party that does not fit goes on the waiting
 * list where the church is taking one, and is refused where it is not: splitting
 * a family across the two would be worse than saying no.
 */
export async function registerForEvent(input: {
  churchSlug: string;
  eventSlug: string;
  today: string;
  now: string;
  party: Registrant[];
  /**
   * R14.2. A place taken from the church's own preview of a draft.
   *
   * Written like any other so the whole path is exercised, flagged so it can
   * be cleared the moment the event is published.
   */
  trial?: boolean;
}): Promise<RegisterResult> {
  const row = await eventRow(input.churchSlug, input.eventSlug, input.trial === true);
  if (!row) throw new InvalidInputError("event.error.missing");

  const state = stateOf(row, input.today, input.now);
  if (state !== "open" && state !== "waitlist") {
    throw new InvalidInputError("event.error.closedToRegistration");
  }

  const party = input.party.filter((one) => one.firstName?.trim());
  if (party.length === 0) throw new InvalidInputError("event.error.noOne");
  if (party.length > PARTY_LIMIT) throw new InvalidInputError("event.error.party");

  const questions = await questionRows(row.formId);

  const errors: { at: number; fieldId: string; message: string }[] = [];
  for (const [at, person] of party.entries()) {
    for (const problem of checkSubmission(questions, person.answers ?? {})) {
      errors.push({ at, fieldId: problem.fieldId, message: problem.message });
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const bookingId = randomUUID();
  let going = 0;
  let waiting = 0;

  await owner().begin(async (tx) => {
    // The event row is locked first, so two parties cannot both read the same
    // last place and both take it.
    const [fresh] = await tx<{
      status: string; takes: boolean; open: boolean; capacity: number | null; waitlist: boolean;
    }[]>`
      select status,
             takes_registrations as takes,
             registration_open as open,
             capacity,
             waitlist
        from events
       where id = ${row.id}
         for update`;
    if (!fresh || fresh.status === "cancelled" || !fresh.takes || !fresh.open) {
      throw new InvalidInputError("event.error.closedToRegistration");
    }

    const [count] = await tx<{ n: number }[]>`
      select count(*)::int as n
        from event_registrations
       where event_id = ${row.id} and state = 'going'`;
    const taken = count?.n ?? 0;
    const room = fresh.capacity === null ? party.length : Math.max(0, fresh.capacity - taken);

    // The whole party goes one way or the other. A family split between the
    // roster and the waiting list is a phone call to the church office.
    const asWaiting = room < party.length;
    if (asWaiting && !fresh.waitlist) {
      throw new InvalidInputError("event.error.noRoom");
    }

    for (const person of party) {
      const answers = prunedAnswers(questions, person.answers ?? {});

      let submissionId: string | null = null;
      if (row.formId) {
        const [saved] = await tx<{ id: string }[]>`
          insert into form_submissions (tenant_id, form_id, answers)
          values (${row.tenantId}, ${row.formId}, ${JSON.stringify(answers)}::jsonb)
          returning id`;
        submissionId = saved!.id;
      }

      const whole = [person.firstName.trim(), person.lastName?.trim()]
        .filter(Boolean)
        .join(" ");

      const [registration] = await tx<{ id: string }[]>`
        insert into event_registrations
          (tenant_id, event_id, booking_id, name, email, phone, state, submission_id, trial)
        values (${row.tenantId}, ${row.id}, ${bookingId},
                ${whole},
                ${person.email?.trim().toLowerCase() || null},
                ${person.phone?.trim() || null},
                ${asWaiting ? "waiting" : "going"},
                ${submissionId},
                ${input.trial === true})
        returning id`;

      /*
       * R4.4. The registrant becomes a person record, through the same matching
       * a form submission uses. The name, email and phone they typed here are
       * added to whatever the questions mapped, so an event that asks nothing
       * still produces a record the church can find.
       */
      const named: FormFieldDef[] = [
        { id: `${registration!.id}:name`, kind: "text", label: "name", help: null, required: true, options: null, position: -3, showWhen: null, mapsTo: "first_name" },
        { id: `${registration!.id}:email`, kind: "email", label: "email", help: null, required: false, options: null, position: -2, showWhen: null, mapsTo: "email" },
        { id: `${registration!.id}:phone`, kind: "phone", label: "phone", help: null, required: false, options: null, position: -1, showWhen: null, mapsTo: "phone" },
      ];

      const identity: Record<string, FormAnswer> = {
        [named[0]!.id]: person.firstName.trim(),
        [named[1]!.id]: person.email?.trim().toLowerCase() ?? null,
        [named[2]!.id]: person.phone?.trim() ?? null,
      };
      // Asked as two fields, so a surname is a surname rather than whatever
      // followed the first space. "Mary Anne van der Berg" was two guesses.
      if (person.lastName?.trim()) {
        named.push({ id: `${registration!.id}:last`, kind: "text", label: "last", help: null, required: false, options: null, position: -1.5, showWhen: null, mapsTo: "last_name" });
        identity[`${registration!.id}:last`] = person.lastName.trim();
      }

      const placed = await placeSubmission(tx, {
        tenantId: row.tenantId,
        submissionId: submissionId ?? registration!.id,
        fields: [...named, ...questions],
        answers: { ...identity, ...answers },
      });

      if (placed.personId) {
        await tx`
          update event_registrations
             set person_id = ${placed.personId}, updated_at = now()
           where id = ${registration!.id}`;
      }

      if (asWaiting) waiting += 1;
      else going += 1;
    }
  });

  return { ok: true, going, waiting };
}
