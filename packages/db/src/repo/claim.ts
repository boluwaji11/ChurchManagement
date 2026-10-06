import type postgres from "postgres";
import { InvalidInputError } from "../errors";

/**
 * R1.7, R2.1. The rules for tying an account to a person record.
 *
 * Two paths arrive here. An invitation names a church and often a record, and
 * an administrator is behind it. Somebody signing up at the church's own
 * address names nobody, and the only thing known about them is the email they
 * proved. The decisions differ, which is why the two callers keep their own
 * policy, but the questions do not, so the SQL that asks them lives once.
 *
 * It used to live twice, in membership.ts and joining.ts, and the two copies
 * had already drifted apart in two ways nobody had decided.
 *
 * Takes the connection rather than opening one, so a caller inside a
 * transaction gets its own view and a caller without one does not pay for a
 * transaction it has no use for.
 */
type Runner = postgres.Sql | postgres.TransactionSql;

/**
 * An unclaimed record this address can take.
 *
 * A child's record is never claimable, whoever the address belongs to: a parent
 * holding a child's mailbox must not end up holding the child's record. Nor is
 * a record somebody's account already holds, or an archived one, or the record
 * of somebody who has died.
 */
export async function claimableRecord(
  db: Runner,
  tenantId: string,
  email: string,
): Promise<string | null> {
  const rows = await db<{ id: string }[]>`
    select p.id
      from members p
      join contact_methods c on c.member_id = p.id and c.tenant_id = p.tenant_id
      left join household_memberships hm on hm.member_id = p.id and hm.tenant_id = p.tenant_id
     where p.tenant_id = ${tenantId}
       and p.archived_at is null
       and p.app_user_id is null
       and p.lifecycle_status <> 'deceased'
       and c.kind = 'email'
       and lower(c.value) = ${email}
       and coalesce(hm.role::text, 'other') <> 'child'
       and (p.date_of_birth is null or p.date_of_birth <= current_date - interval '18 years')
     limit 1`;
  return rows[0]?.id ?? null;
}

/** Whether some other account already holds a record carrying this address. */
export async function addressAlreadyClaimed(
  db: Runner,
  tenantId: string,
  email: string,
): Promise<boolean> {
  const rows = await db<{ id: string }[]>`
    select p.id
      from members p
      join contact_methods c on c.member_id = p.id and c.tenant_id = p.tenant_id
     where p.tenant_id = ${tenantId}
       and p.archived_at is null
       and p.app_user_id is not null
       and c.kind = 'email'
       and lower(c.value) = ${email}
     limit 1`;
  return rows.length > 0;
}

/** The record an account already holds in this church, where it holds one. */
export async function recordForAccount(
  db: Runner,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const rows = await db<{ id: string }[]>`
    select id from members
     where tenant_id = ${tenantId} and app_user_id = ${userId} and archived_at is null
     limit 1`;
  return rows[0]?.id ?? null;
}

/** Ties an unclaimed record to an account. Null when somebody got there first. */
export async function claimRecord(
  db: Runner,
  tenantId: string,
  memberId: string,
  userId: string,
): Promise<string | null> {
  const rows = await db<{ id: string }[]>`
    update members set app_user_id = ${userId}
     where id = ${memberId} and tenant_id = ${tenantId} and app_user_id is null
    returning id`;
  return rows[0]?.id ?? null;
}

/**
 * A new record for somebody the church has nothing on, written from what they
 * typed when they made the account.
 *
 * The lifecycle is the caller's to decide. Somebody an administrator invited is
 * a member of the church. Somebody who found the church's address and signed
 * themselves up is a visitor until the church says otherwise.
 */
export async function writeRecordFor(
  db: Runner,
  input: {
    tenantId: string;
    userId: string;
    email: string;
    first: string;
    last: string;
    lifecycle: "member" | "visitor";
  },
): Promise<string> {
  const rows = await db<{ id: string }[]>`
    insert into members (tenant_id, slug, first_name, last_name, lifecycle_status, app_user_id)
    values (${input.tenantId},
            hearth_free_member_slug(${input.tenantId}::uuid,
                                    ${`${input.first} ${input.last}`.trim()}),
            ${input.first}, ${input.last}, ${input.lifecycle}, ${input.userId})
    returning id`;
  const id = rows[0]!.id;

  await db`
    insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
    values (${input.tenantId}, ${id}, 'email', 'home', ${input.email}, true)`;

  return id;
}

/**
 * A first and last name for a record.
 *
 * Sign-up asks for the two separately, so the split only runs for an account
 * made before it did, or one that arrived from somewhere else.
 */
export function nameForRecord(
  user: { fullName?: string | null; firstName?: string | null; lastName?: string | null },
  email: string,
): { first: string; last: string } {
  const first = user.firstName?.trim();
  if (first) return { first, last: user.lastName?.trim() ?? "" };

  const parts = (user.fullName ?? "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { first: parts[0]!, last: parts.slice(1).join(" ") };
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: email.split("@")[0] ?? email, last: "" };
}

/**
 * R1.7. Writes the account row, and releases the address first where it is held
 * by an account that no longer exists.
 *
 * app_users.id is the Supabase auth user's id and the email is unique, so an
 * auth user deleted out from under us leaves a row holding an address its owner
 * can never use again: signing up issues a new id, and the insert collides on
 * the email rather than on the id. That used to be an unhandled constraint
 * violation on the screen where somebody creates their church.
 *
 * The leftover is released only when nothing is behind it: no auth user, no
 * membership, no person record. tenant_members cascades from here, so deleting
 * a row that still had memberships would quietly take a church away from
 * somebody. An address that is genuinely in use is refused instead, in the same
 * words sign-up uses.
 */
export async function writeAccount(
  db: Runner,
  user: { id: string; email: string; fullName?: string | null },
): Promise<void> {
  const email = user.email.trim().toLowerCase();

  await db`
    delete from app_users a
     where a.email = ${email}
       and a.id <> ${user.id}
       and not exists (select 1 from auth.users u where u.id = a.id)
       and not exists (select 1 from tenant_members m where m.user_id = a.id)
       and not exists (select 1 from members p where p.app_user_id = a.id)`;

  try {
    await db`
      insert into app_users (id, email, full_name)
      values (${user.id}, ${email}, ${user.fullName ?? null})
      on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, app_users.full_name)`;
  } catch (error) {
    if (
      error instanceof Error
      && "constraint_name" in error
      && error["constraint_name"] === "app_users_email_key"
    ) {
      throw new InvalidInputError("auth.error.taken");
    }
    throw error;
  }
}
