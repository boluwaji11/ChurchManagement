/**
 * R1.7, R22.1. How somebody who is not staff gets an account.
 *
 * The order is church, then members, then accounts. A church exists first.
 * People are records the church made, by import, by a form, at a check-in desk
 * or by hand. An account claims one of those records, and the proof is an
 * address the church already wrote down.
 *
 * The church is named by the address they arrived at, so there is nothing to
 * type and nothing to leak. A church that has its door open lets somebody in
 * and nobody is asked to approve anything; the control is the switch and the
 * cap on a provisional church, which is the argument that was settled once
 * already in provisional.ts. The only question left is which record they get:
 * the one the church already has under that address, or a new one written the
 * moment they arrive.
 *
 * Everything here before the membership exists runs on the owner connection, as
 * the rest of membership.ts does. There is no tenant context to set for somebody
 * who is not yet in the tenant.
 */
import { owner } from "../client";
import { InvalidInputError } from "../errors";
import { PermissionError, type TenantRole } from "../roles";
import { canManageChurch } from "./church";
import { claimRecord, claimableRecord, nameForRecord, writeRecordFor } from "./claim";

export interface JoinTarget {
  tenantId: string;
  slug: string;
  name: string;
}

/**
 * The church behind a public address, where that church is open to it.
 *
 * Runs before anybody is anybody. A church nobody has looked at yet has no
 * public door, and a demo church is nobody's.
 */
export async function churchForSelfSignup(slug: string): Promise<JoinTarget | null> {
  const value = slug.trim().toLowerCase();
  if (!value) return null;

  const sql = owner();
  const rows = await sql<JoinTarget[]>`
    select id as "tenantId", slug, name from tenants
    where slug = ${value}
      and self_signup
      and demo_expires_at is null
      and approved_at is not null
    limit 1`;
  return rows[0] ?? null;
}

/** R1.7. Opening or shutting the church's own door. */
export async function setSelfSignup(
  tenantId: string,
  role: TenantRole,
  open: boolean,
): Promise<void> {
  if (!canManageChurch(role)) throw new PermissionError(role, "editChurch");

  const sql = owner();

  /*
   * R1.1. A church nobody has looked at yet does not get a door to the public.
   * Opening one is the thing a church cannot undo, and it is the thing worth
   * having for somebody who is not a church.
   */
  if (open) {
    const [standing] = await sql<{ approved: boolean }[]>`
      select approved_at is not null as approved from tenants where id = ${tenantId}`;
    if (!standing?.approved) throw new InvalidInputError("provisional.error.locked");
  }

  await sql`update tenants set self_signup = ${open} where id = ${tenantId}`;
}

export type JoinOutcome =
  /** In, holding a record: the one that was already there, or one written now. */
  | { status: "joined"; slug: string; name: string }
  /** They were already in. */
  | { status: "member"; slug: string; name: string };

/**
 * R1.7. Going through the door.
 *
 * One transaction, because a half-finished join is somebody holding a record
 * they cannot reach or a membership pointing at nothing.
 *
 * A child's record is never claimable, whoever the address belongs to. A record
 * somebody else has already claimed is not claimable either: that is a shared
 * mailbox or a mistake. Both cases get their own new record instead, which the
 * church merges (R2.8) if it turns out to be the same person.
 */
export async function joinChurch(input: {
  slug: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified: boolean;
  };
}): Promise<JoinOutcome> {
  if (!input.user.emailVerified) throw new InvalidInputError("error.emailUnverified");

  const target = await churchForSelfSignup(input.slug);
  if (!target) throw new InvalidInputError("join.error.shut");

  const email = input.user.email.trim().toLowerCase();
  const fullName = input.user.fullName?.trim() || null;
  const sql = owner();

  return sql.begin(async (tx) => {
    /*
     * R1.11, R21.5. Who did this, for the append-only log.
     *
     * The audit trigger reads the actor off the session, and this connection is
     * the owner one, which never sets it. Without these two lines every record
     * written by somebody joining lands in the log with a null actor, which is
     * the one question the log exists to answer. Transaction-local, so a pooled
     * connection cannot leak them into the next request.
     */
    await tx`select set_config('app.user_id', ${input.user.id}, true)`;
    await tx`select set_config('app.role', 'member', true)`;

    await tx`
      insert into app_users (id, email, full_name)
      values (${input.user.id}, ${email}, ${fullName})
      on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, app_users.full_name)`;

    const already = await tx`
      select 1 from tenant_members
      where tenant_id = ${target.tenantId} and user_id = ${input.user.id} limit 1`;
    if (already.length > 0) {
      return { status: "member", slug: target.slug, name: target.name } as JoinOutcome;
    }

    const member = async () => {
      await tx`
        insert into tenant_members (tenant_id, user_id, role)
        values (${target.tenantId}, ${input.user.id}, 'member')
        on conflict (tenant_id, user_id) do nothing`;
      return { status: "joined", slug: target.slug, name: target.name } as JoinOutcome;
    };

    const matched = await claimableRecord(tx, target.tenantId, email);
    if (matched && (await claimRecord(tx, target.tenantId, matched, input.user.id))) {
      return member();
    }

    /*
     * Nothing to claim, so the church has a new visitor. This is where the two
     * paths part: an invitation stops when the address is already somebody
     * else's, because an administrator sent it and can sort it out. Here there
     * is nobody to ask, and a household sharing one mailbox is ordinary, so
     * refusing would lock a real person out of their own church. A second
     * record is written and the church merges it (R2.8) if it turns out to be
     * the same person.
     */
    const name = nameForRecord(input.user, email);
    await writeRecordFor(tx, {
      tenantId: target.tenantId,
      userId: input.user.id,
      email,
      first: name.first,
      last: name.last,
      lifecycle: "visitor",
    });

    return member();
  }) as Promise<JoinOutcome>;
}
