import type { Sql, TransactionSql } from "postgres";
import { indexPeople, findMatches, type ExistingPerson } from "../import/match";
import {
  CUSTOM_TARGET, answered,
  type FormAnswer, type FormFieldDef,
} from "./form-rules";

/**
 * R4.4. A submitted form becoming a person record.
 *
 * This is the whole value of forms. A church that has to retype a connection
 * card into the directory has bought itself a second job, so a submission finds
 * the person it is about, or writes the record it is about, and the answers
 * land on their record rather than only in a list of responses.
 *
 * The matching rules are the R2.8 ones the import uses, unchanged. What a
 * church calls a duplicate on import and what it calls a duplicate here are the
 * same thing, and two sets of rules that disagreed would be worse than one.
 *
 * Runs on raw SQL against a transaction handle, because a public submission has
 * no session to set a tenant from. Every statement carries its own tenant
 * predicate.
 */

export type MatchState = "created" | "matched" | "review" | "none";

/** The parts of a person a form can carry, pulled out of the answers. */
export interface Identity {
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: string | null;
  };
  /** Custom field id to the value given. */
  custom: Record<string, FormAnswer>;
}

const text = (answer: FormAnswer): string | null => {
  if (!answered(answer)) return null;
  if (Array.isArray(answer)) return answer.join(", ");
  return String(answer).trim() || null;
};

/**
 * R4.4. Reads the answers through the targets the church set on the questions.
 *
 * A question with no target is left where it is, in the submission, because not
 * every question is about the person. "What are you hoping for from a group?"
 * belongs on the response and nowhere else.
 */
export function identityFrom(
  fields: FormFieldDef[],
  answers: Record<string, FormAnswer>,
): Identity {
  const out: Identity = {
    firstName: null, lastName: null, preferredName: null,
    email: null, phone: null, dateOfBirth: null,
    address: { line1: null, line2: null, city: null, region: null, postalCode: null, country: null },
    custom: {},
  };

  for (const field of fields) {
    const target = field.mapsTo;
    if (!target) continue;
    const answer = answers[field.id] ?? null;
    if (!answered(answer)) continue;

    if (target.startsWith(CUSTOM_TARGET)) {
      out.custom[target.slice(CUSTOM_TARGET.length)] = answer;
      continue;
    }

    switch (target) {
      case "first_name": out.firstName = text(answer); break;
      case "last_name": out.lastName = text(answer); break;
      case "preferred_name": out.preferredName = text(answer); break;
      case "email": out.email = text(answer)?.toLowerCase() ?? null; break;
      case "phone": out.phone = text(answer); break;
      case "date_of_birth": out.dateOfBirth = text(answer); break;
      case "address_line1": out.address.line1 = text(answer); break;
      case "address_line2": out.address.line2 = text(answer); break;
      case "city": out.address.city = text(answer); break;
      case "region": out.address.region = text(answer); break;
      case "postal_code": out.address.postalCode = text(answer); break;
      case "country": out.address.country = text(answer); break;
      default: break;
    }
  }

  return out;
}

/** Whether the form asked anything a person could be found by. */
export function namesSomebody(identity: Identity): boolean {
  return Boolean(
    identity.email
    || identity.phone
    || (identity.firstName && identity.lastName),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Handle = Sql | TransactionSql;

/** The church's directory, as the R2.8 rules want it. */
async function directory(tx: Handle, tenantId: string): Promise<ExistingPerson[]> {
  const rows = await tx<{
    id: string; firstName: string; lastName: string;
    preferredName: string | null; dateOfBirth: string | null;
  }[]>`
    select id,
           first_name as "firstName",
           last_name as "lastName",
           preferred_name as "preferredName",
           to_char(date_of_birth, 'YYYY-MM-DD') as "dateOfBirth"
      from people
     where tenant_id = ${tenantId}
       and archived_at is null`;

  const contacts = await tx<{ personId: string; kind: string; value: string }[]>`
    select person_id as "personId", kind::text as kind, value
      from contact_methods
     where tenant_id = ${tenantId}`;

  const emails = new Map<string, string[]>();
  const phones = new Map<string, string[]>();
  for (const one of contacts) {
    const into = one.kind === "email" ? emails : phones;
    const list = into.get(one.personId);
    if (list) list.push(one.value);
    else into.set(one.personId, [one.value]);
  }

  return rows.map((row) => ({
    ...row,
    emails: emails.get(row.id) ?? [],
    phones: phones.get(row.id) ?? [],
  }));
}

/**
 * R4.4. Finds who a submission is about, or writes the record it is about.
 *
 * One certain match is taken. Anything less sure, and anything with two certain
 * matches under it, is left for somebody to look at (R4.5): merging two people
 * because a form was filled in twice is a worse outcome than a row in a queue.
 *
 * Nothing already on a record is overwritten. A connection card filled in with
 * a nickname cannot rename somebody in the directory, so an answer fills a
 * field that is empty and otherwise joins the record as another contact method.
 */
export async function placeSubmission(
  tx: Handle,
  input: {
    tenantId: string;
    submissionId: string;
    fields: FormFieldDef[];
    answers: Record<string, FormAnswer>;
  },
): Promise<{ state: MatchState; personId: string | null }> {
  const identity = identityFrom(input.fields, input.answers);

  if (!namesSomebody(identity)) {
    return settle(tx, input.submissionId, "none", null);
  }

  const index = indexPeople(await directory(tx, input.tenantId));
  const matches = findMatches(index, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    phone: identity.phone,
    dateOfBirth: identity.dateOfBirth,
  });

  const certain = matches.filter((one) => one.confidence === "certain");

  if (certain.length === 1) {
    const personId = certain[0]!.personId;
    await fillBlanks(tx, input.tenantId, personId, identity);
    await writeCustom(tx, input.tenantId, personId, identity.custom);
    return settle(tx, input.submissionId, "matched", personId);
  }

  // Two certain matches is two records that are probably one person, which is
  // the directory's problem rather than this form's. Somebody looks.
  if (matches.length > 0) {
    return settle(tx, input.submissionId, "review", null);
  }

  const personId = await createPerson(tx, input.tenantId, identity);
  await writeCustom(tx, input.tenantId, personId, identity.custom);
  return settle(tx, input.submissionId, "created", personId);
}

async function settle(
  tx: Handle,
  submissionId: string,
  state: MatchState,
  personId: string | null,
): Promise<{ state: MatchState; personId: string | null }> {
  await tx`
    update form_submissions
       set match_state = ${state}, person_id = ${personId}
     where id = ${submissionId}`;
  return { state, personId };
}

/**
 * R4.4, R2.1. A person the church has never recorded.
 *
 * A visitor, because somebody who filled in a form is somebody the church has
 * met and nothing more than that is known yet. The lifecycle work (HRT-210)
 * moves them on from here.
 */
async function createPerson(
  tx: Handle,
  tenantId: string,
  identity: Identity,
): Promise<string> {
  const [first, last] = splitName(identity);

  const [person] = await tx<{ id: string }[]>`
    insert into people (tenant_id, slug, first_name, last_name, preferred_name,
                        date_of_birth, lifecycle_status, first_visit_on)
    values (${tenantId},
            hearth_free_person_slug(${tenantId}::uuid, ${`${first} ${last}`.trim()}),
            ${first}, ${last}, ${identity.preferredName},
            ${identity.dateOfBirth}, 'visitor', current_date)
    returning id`;
  const personId = person!.id;

  await addContacts(tx, tenantId, personId, identity, { primary: true });
  await addAddress(tx, tenantId, personId, identity);
  return personId;
}

/**
 * A name out of whatever the form asked for.
 *
 * A form that asks only for an email address still has to produce a record
 * somebody can find, so the part before the @ becomes the name until a human
 * knows better. A blank surname is allowed: plenty of records start that way
 * and inventing one would be worse.
 */
function splitName(identity: Identity): [string, string] {
  if (identity.firstName || identity.lastName) {
    return [identity.firstName ?? "", identity.lastName ?? ""];
  }
  const handle = identity.email?.split("@")[0] ?? identity.phone ?? "";
  return [handle, ""];
}

async function addContacts(
  tx: Handle,
  tenantId: string,
  personId: string,
  identity: Identity,
  opts: { primary: boolean },
): Promise<void> {
  if (identity.email) {
    await tx`
      insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
      values (${tenantId}, ${personId}, 'email', 'home', ${identity.email}, ${opts.primary})`;
  }
  if (identity.phone) {
    await tx`
      insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
      values (${tenantId}, ${personId}, 'phone', 'mobile', ${identity.phone}, ${opts.primary})`;
  }
}

async function addAddress(
  tx: Handle,
  tenantId: string,
  personId: string,
  identity: Identity,
): Promise<void> {
  const a = identity.address;
  if (!a.line1) return;

  await tx`
    insert into addresses (tenant_id, person_id, line1, line2, city, region,
                           postal_code, country, is_primary)
    values (${tenantId}, ${personId}, ${a.line1}, ${a.line2}, ${a.city},
            ${a.region}, ${a.postalCode}, ${a.country ?? "US"}, true)`;
}

/**
 * R4.4. Adds what the record did not already hold.
 *
 * A form never overwrites. Somebody filling in a connection card at a service
 * is not authorising a change to the directory, and a church that found its
 * records rewritten by a public form would never open another one.
 */
async function fillBlanks(
  tx: Handle,
  tenantId: string,
  personId: string,
  identity: Identity,
): Promise<void> {
  await tx`
    update people
       set preferred_name = coalesce(preferred_name, ${identity.preferredName}),
           date_of_birth = coalesce(date_of_birth, ${identity.dateOfBirth}::date),
           updated_at = now()
     where id = ${personId} and tenant_id = ${tenantId}`;

  // A new address or a new number joins the record rather than replacing one.
  // Anything already there under the same value is left alone.
  if (identity.email) {
    const [had] = await tx<{ id: string }[]>`
      select id from contact_methods
       where tenant_id = ${tenantId} and person_id = ${personId}
         and kind = 'email' and lower(value) = ${identity.email}
       limit 1`;
    if (!had) {
      await tx`
        insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
        values (${tenantId}, ${personId}, 'email', 'home', ${identity.email}, false)`;
    }
  }

  if (identity.phone) {
    const digits = identity.phone.replace(/\D/g, "").slice(-10);
    const [had] = await tx<{ id: string }[]>`
      select id from contact_methods
       where tenant_id = ${tenantId} and person_id = ${personId}
         and kind = 'phone'
         and right(regexp_replace(value, '\\D', '', 'g'), 10) = ${digits}
       limit 1`;
    if (!had) {
      await tx`
        insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
        values (${tenantId}, ${personId}, 'phone', 'mobile', ${identity.phone}, false)`;
    }
  }

  if (identity.address.line1) {
    const [had] = await tx<{ id: string }[]>`
      select id from addresses
       where tenant_id = ${tenantId} and person_id = ${personId}
       limit 1`;
    if (!had) await addAddress(tx, tenantId, personId, identity);
  }
}

/**
 * R4.4. The church's own fields, written onto the record.
 *
 * A field id from another church is simply not in this church's list, so it is
 * ignored. There is nobody on the far end of a public form to tell.
 */
async function writeCustom(
  tx: Handle,
  tenantId: string,
  personId: string,
  values: Record<string, FormAnswer>,
): Promise<void> {
  // Only things shaped like an id reach the query, because the cast to uuid[]
  // throws on anything else and a form is public input.
  const ids = Object.keys(values).filter((one) => UUID.test(one));
  if (ids.length === 0) return;

  const known = await tx<{ id: string }[]>`
    select id from custom_fields
     where tenant_id = ${tenantId} and entity = 'person' and id = any(${ids}::uuid[])`;

  for (const field of known) {
    await tx`
      insert into custom_field_values (tenant_id, field_id, entity_id, value)
      values (${tenantId}, ${field.id}, ${personId}, ${JSON.stringify(values[field.id])}::jsonb)
      on conflict (field_id, entity_id) do update set value = excluded.value`;
  }
}

/**
 * R4.4. Runs the matching again over submissions that never landed anywhere.
 *
 * A church builds a form, collects answers, and only then sets which question
 * holds the name and which holds the email. Without this those responses stay
 * a list forever, and the church has to type them into the directory by hand,
 * which is the job forms exist to remove.
 *
 * Only the ones that landed nowhere are touched. A submission already attached
 * to somebody is left alone, because running it again could attach it to
 * somebody else after a human decided.
 */
export async function placeUnplaced(
  sql: Sql,
  input: { tenantId: string; formId: string; fields: FormFieldDef[] },
): Promise<{ placed: number; waiting: number }> {
  const rows = await sql<{ id: string; answers: Record<string, FormAnswer> }[]>`
    select id, answers
      from form_submissions
     where tenant_id = ${input.tenantId}
       and form_id = ${input.formId}
       and person_id is null
       and match_state <> 'review'
     order by created_at`;

  let placed = 0;
  let waiting = 0;

  for (const row of rows) {
    // One transaction each. A church with two hundred responses should not lose
    // the lot because the hundredth row is strange.
    const result = await sql.begin((tx) =>
      placeSubmission(tx, {
        tenantId: input.tenantId,
        submissionId: row.id,
        fields: input.fields,
        answers: row.answers ?? {},
      }),
    ) as { state: MatchState; personId: string | null };

    if (result.personId) placed += 1;
    else if (result.state === "review") waiting += 1;
  }

  return { placed, waiting };
}
