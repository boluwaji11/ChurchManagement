import type { TransactionSql } from "postgres";
import { owner } from "../client";
import { InvalidInputError } from "../errors";
import {
  checkSubmission, prunedAnswers,
  type ConditionOp, type FormAnswer, type FormFieldDef, type FormFieldKind,
} from "./form-rules";
import { publicChurch, type PublicChurch } from "./public-groups";
import { placeSubmission } from "./form-matching";

/**
 * R4.3. A form as somebody with no account meets it.
 *
 * A church pastes the link into its own website, or drops the snippet into a
 * page, and whoever follows it answers the questions without signing in. That
 * is the whole point of a connection card: the person filling it in is the one
 * the church does not have a record of yet.
 *
 * Runs on the owner connection for the same reason `public-groups` does: there
 * is no session to set a tenant from, so every query here carries its own
 * tenant predicate and names its columns by hand. Nothing is read or written
 * beyond the one form the link names.
 */

export type PublicFormState = "open" | "closed" | "full";

export interface PublicForm {
  church: PublicChurch;
  id: string;
  name: string;
  intro: string | null;
  thanks: string | null;
  state: PublicFormState;
  /** R24.4. The form's own colour, and the picture across the top. */
  hue: string;
  coverKey: string | null;
  fields: FormFieldDef[];
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

interface FormRow {
  id: string;
  tenantId: string;
  name: string;
  intro: string | null;
  thanks: string | null;
  status: string;
  submissionLimit: number | null;
  received: number;
  hue: string;
  coverKey: string | null;
}

/**
 * The form a public link names, or null.
 *
 * A draft has no public link at all, which is the difference between a draft
 * and a closed form: a closed one was open once and its link still answers,
 * saying it has closed.
 */
async function formRow(churchSlug: string, formSlug: string): Promise<FormRow | null> {
  if (!SLUG.test(churchSlug) || !SLUG.test(formSlug)) return null;

  const rows = await owner()<FormRow[]>`
    select f.id,
           f.tenant_id as "tenantId",
           f.name,
           f.intro,
           f.thanks,
           f.status,
           f.submission_limit as "submissionLimit",
           f.hue::text as hue,
           f.cover_key as "coverKey",
           (select count(*) from form_submissions s where s.form_id = f.id)::int as received
      from forms f
      join tenants t on t.id = f.tenant_id
     where t.slug = ${churchSlug}
       and t.approved_at is not null
       and t.demo_expires_at is null
       and f.slug = ${formSlug}
       and f.archived_at is null
       and f.status <> 'draft'
     limit 1`;
  return rows[0] ?? null;
}

/** R4.9. Open, closed by the church, or closed because it filled up. */
function stateOf(row: FormRow): PublicFormState {
  if (row.status !== "open") return "closed";
  if (row.submissionLimit !== null && row.received >= row.submissionLimit) return "full";
  return "open";
}

interface FieldRow {
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
}

const asField = (row: FieldRow): FormFieldDef => ({
  id: row.id,
  kind: row.kind as FormFieldKind,
  label: row.label,
  help: row.help,
  required: row.required,
  options: row.options,
  position: row.position,
  showWhen: row.showWhenFieldId && row.showWhenOp
    ? {
        fieldId: row.showWhenFieldId,
        op: row.showWhenOp as ConditionOp,
        value: row.showWhenValue,
      }
    : null,
});

async function fieldRows(formId: string): Promise<FormFieldDef[]> {
  const rows = await owner()<FieldRow[]>`
    select id,
           kind,
           label,
           help,
           required,
           options,
           position,
           show_when_field_id as "showWhenFieldId",
           show_when_op as "showWhenOp",
           show_when_value as "showWhenValue"
      from form_fields
     where form_id = ${formId}
     order by position, created_at`;
  return rows.map(asField);
}

/** R4.3. The form behind a public link, with the church it belongs to. */
export async function publicForm(
  churchSlug: string,
  formSlug: string,
): Promise<PublicForm | null> {
  const church = await publicChurch(churchSlug);
  if (!church) return null;

  const row = await formRow(churchSlug, formSlug);
  if (!row) return null;

  return {
    church,
    id: row.id,
    name: row.name,
    intro: row.intro,
    thanks: row.thanks,
    state: stateOf(row),
    hue: row.hue,
    coverKey: row.coverKey,
    fields: await fieldRows(row.id),
  };
}

export type SubmitResult =
  | { ok: true; thanks: string | null }
  /** R4.9. Which questions came back wrong, keyed by question. */
  | { ok: false; errors: Record<string, string> };

/**
 * R4.3, R4.9. Takes an answered form from somebody with no account.
 *
 * Everything the browser sent is checked again here. The screen runs the same
 * rules while somebody types so the mistakes are caught early, and this runs
 * them because the screen is not where the decision can be made.
 *
 * Whether the form is still taking answers is read inside the transaction, so
 * the last place on a form of twelve goes to one person rather than to whoever
 * loaded the page first.
 */
export async function submitPublicForm(input: {
  churchSlug: string;
  formSlug: string;
  answers: Record<string, FormAnswer>;
  /**
   * R14.2. The event this form was reached from, where it was reached from one.
   *
   * A church links one form from several events, so the event cannot be read
   * off the form. It rides the link, and with it the answer becomes a place at
   * that event as well as a response on the form: counted against its capacity,
   * on its roster, on the waiting list when it is full.
   */
  eventSlug?: string | null;
}): Promise<SubmitResult> {
  const row = await formRow(input.churchSlug, input.formSlug);
  if (!row) throw new InvalidInputError("form.error.missing");

  const fields = await fieldRows(row.id);
  const problems = checkSubmission(fields, input.answers);
  if (problems.length > 0) {
    return {
      ok: false,
      errors: Object.fromEntries(problems.map((one) => [one.fieldId, one.message])),
    };
  }

  // R4.2. What they were last shown is what is recorded. An answer to a
  // question that disappeared under them is not an answer they gave.
  const answers = prunedAnswers(fields, input.answers);

  await owner().begin(async (tx) => {
    // The form row is locked first and counted second, so two members sending
    // the last place at once are serialised on the form rather than racing.
    const [fresh] = await tx<{ status: string; limit: number | null }[]>`
      select status, submission_limit as limit
        from forms
       where id = ${row.id}
         for update`;
    if (!fresh || fresh.status !== "open") throw new InvalidInputError("form.error.closed");

    if (fresh.limit !== null) {
      const [count] = await tx<{ n: number }[]>`
        select count(*)::int as n from form_submissions where form_id = ${row.id}`;
      if ((count?.n ?? 0) >= fresh.limit) throw new InvalidInputError("form.error.closed");
    }

    const [saved] = await tx<{ id: string }[]>`
      insert into form_submissions (tenant_id, form_id, answers)
      values (${row.tenantId}, ${row.id}, ${JSON.stringify(answers)}::jsonb)
      returning id`;

    // R4.4. The answers become a person record in the same transaction, so a
    // response can never sit in the list with nothing behind it.
    const placed = await placeSubmission(tx, {
      tenantId: row.tenantId,
      submissionId: saved!.id,
      fields,
      answers,
    });

    if (input.eventSlug) {
      await takePlace(tx, {
        tenantId: row.tenantId,
        eventSlug: input.eventSlug,
        submissionId: saved!.id,
        memberId: placed.memberId,
        who: nameFrom(fields, answers),
      });
    }
  });

  return { ok: true, thanks: row.thanks };
}

/** What to call this registrant on the roster, from whatever the form asked. */
function nameFrom(
  fields: FormFieldDef[],
  answers: Record<string, FormAnswer>,
): { name: string; email: string | null; phone: string | null } {
  const read = (target: string): string | null => {
    const field = fields.find((one) => one.mapsTo === target);
    const answer = field ? answers[field.id] : null;
    const text = typeof answer === "string" ? answer.trim() : null;
    return text || null;
  };

  const email = read("email");
  const name = [read("first_name"), read("last_name")].filter(Boolean).join(" ").trim();

  return {
    name: name || email?.split("@")[0] || "",
    email: email?.toLowerCase() ?? null,
    phone: read("phone"),
  };
}

/**
 * R14.2, R14.4. Turns a submission into a place at an event.
 *
 * The event row is locked first, so the last place cannot go to two members who
 * sent the form at the same moment. A full event takes the name for its waiting
 * list, which is what every event does now.
 *
 * A form reached from an event that is not taking registrations still records
 * the response. The church asked a question and somebody answered it, and
 * throwing that away because a date passed would lose the one thing worth
 * keeping.
 */
async function takePlace(
  tx: TransactionSql,
  input: {
    tenantId: string;
    eventSlug: string;
    submissionId: string;
    memberId: string | null;
    who: { name: string; email: string | null; phone: string | null };
  },
): Promise<void> {
  const [event] = await tx<{
    id: string; status: string; takes: boolean; open: boolean; capacity: number | null;
  }[]>`
    select id, status,
           takes_registrations as takes,
           registration_open as open,
           capacity
      from events
     where tenant_id = ${input.tenantId} and slug = ${input.eventSlug}
       and archived_at is null
       for update`;

  if (!event || !event.takes || event.status === "cancelled" || !event.open) return;

  let state = "going";
  if (event.capacity !== null) {
    const [count] = await tx<{ n: number }[]>`
      select count(*)::int as n
        from event_registrations
       where event_id = ${event.id} and state = 'going'`;
    if ((count?.n ?? 0) >= event.capacity) state = "waiting";
  }

  await tx`
    insert into event_registrations
      (tenant_id, event_id, booking_id, member_id, name, email, phone, state, submission_id)
    values (${input.tenantId}, ${event.id}, gen_random_uuid(), ${input.memberId},
            ${input.who.name}, ${input.who.email}, ${input.who.phone},
            ${state}, ${input.submissionId})`;
}

/**
 * R4.1, R1.16. Room for a file somebody with no account is attaching.
 *
 * The same ceiling and the same ledger an upload from inside the church goes
 * through, read on the owner connection because there is no session to set a
 * tenant from. Checked before a byte is written: a quota found out afterwards
 * is not a quota.
 */
export async function roomForPublicFile(
  churchSlug: string,
  bytes: number,
): Promise<{ tenantId: string } | null> {
  if (!SLUG.test(churchSlug) || bytes <= 0) return null;

  const rows = await owner()<{ tenantId: string; used: string; quota: string }[]>`
    select t.id as "tenantId",
           coalesce((select sum(f.bytes) from stored_files f where f.tenant_id = t.id), 0)::text as used,
           t.storage_quota_bytes::text as quota
      from tenants t
     where t.slug = ${churchSlug}
       and t.approved_at is not null
       and t.demo_expires_at is null
     limit 1`;

  const row = rows[0];
  if (!row) return null;
  if (Number(row.used) + bytes > Number(row.quota)) return null;
  return { tenantId: row.tenantId };
}

/** R1.16. The ledger row for a file attached from the open web. */
export async function recordPublicFile(input: {
  tenantId: string;
  key: string;
  contentType: string;
  bytes: number;
}): Promise<void> {
  await owner()`
    insert into stored_files (tenant_id, bucket, key, purpose, content_type, bytes)
    values (${input.tenantId}, 'church', ${input.key}, 'form_answer',
            ${input.contentType}, ${input.bytes})`;
}
