import { eq, and, ne } from "drizzle-orm";
import type { Tx } from "../client";
import { owner } from "../client";
import { tenants } from "../schema/tenancy";
import { PermissionError } from "../roles";
import { InvalidInputError, NameTakenError } from "../errors";
import { canManageChurch } from "./church";
import type { WriteActor } from "./members";

/**
 * R1.1, R17.1. A church's own address for its members' screens.
 *
 * The point of it is the cookie. A session on connectapp.church inside a frame
 * on the church's site is a third-party cookie, which Safari refuses outright,
 * so the only way the signed-in screens can live on a church's own domain is
 * for the request to arrive at that domain. Then the cookie is first-party and
 * nothing is being worked around.
 */

/** What a host has to look like before it is worth asking the database. */
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** The address as it will be compared: lower case, no scheme, no port, no path. */
export function cleanDomain(value: string): string | null {
  const bare = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  return bare && HOST.test(bare) && bare.length <= 253 ? bare : null;
}

/**
 * Which church this host belongs to.
 *
 * One of the documented pre-authorization reads, the same shape as resolving a
 * church by its address: there is no tenant context to set until the tenant is
 * known, and the host is what names it. It answers nothing but an id, a name
 * and an address, and membership is still verified afterwards.
 */
export async function resolveTenantByHost(
  host: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  const bare = cleanDomain(host);
  if (!bare) return null;

  const rows = await owner()<{ id: string; name: string; slug: string }[]>`
    select id, name, slug from tenants where custom_domain = ${bare} limit 1`;
  return rows[0] ?? null;
}

/**
 * R1.1. Setting it, or clearing it.
 *
 * Refused where another church already has it, because two churches on one
 * host is a request nobody can answer.
 */
export async function setCustomDomain(
  db: Tx,
  actor: WriteActor,
  input: { domain: string | null },
): Promise<string | null> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const bare = input.domain?.trim() ? cleanDomain(input.domain) : null;
  if (input.domain?.trim() && !bare) throw new InvalidInputError("domain.error.shape");

  if (bare) {
    const [taken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.customDomain, bare), ne(tenants.id, actor.tenantId)))
      .limit(1);
    if (taken) throw new NameTakenError("domain.error.taken", bare, taken.id);
  }

  await db
    .update(tenants)
    .set({ customDomain: bare })
    .where(eq(tenants.id, actor.tenantId));

  return bare;
}

/** Every church that has one, for whoever runs the deployment. */
export async function churchesWithDomains(): Promise<{ slug: string; domain: string }[]> {
  return owner()<{ slug: string; domain: string }[]>`
    select slug, custom_domain as domain from tenants
     where custom_domain is not null order by slug`;
}
