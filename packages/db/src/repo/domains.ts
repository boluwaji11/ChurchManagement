import { eq, and, ne } from "drizzle-orm";
import type { Tx } from "../client";
import { owner } from "../client";
import { tenants } from "../schema/tenancy";
import { PermissionError } from "../roles";
import { InvalidInputError, NameTakenError } from "../errors";
import { canManageChurch } from "./church";
import type { WriteActor } from "./members";
import {
  cleanDomain, slugUnderPlatform, cleanPortalName, isReservedName,
} from "./portal-rules";

/**
 * R1.1, R17.1. A church's own address for its members' screens.
 *
 * The point of it is the cookie. A session on connectapp.church inside a frame
 * on the church's site is a third-party cookie, which Safari refuses outright,
 * so the only way the signed-in screens can live on a church's own domain is
 * for the request to arrive at that domain. Then the cookie is first-party and
 * nothing is being worked around.
 */

















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
): Promise<{ id: string; name: string; slug: string; portalName: string | null } | null> {
  const bare = cleanDomain(host);
  if (!bare) return null;

  /* R1.1. A name under ours names the church by its own slug, which is the
     address every church has without doing anything. */
  const under = slugUnderPlatform(bare);
  if (under) {
    /* The name the church chose, or its slug, which answers from the day it
       signs up and goes on answering after a name is chosen. */
    /* R17.1. A church that has turned its address off is not reachable at
       it, so the host names nobody. */
    const rows = await owner()<
      { id: string; name: string; slug: string; portal_name: string | null }[]
    >`
      select id, name, slug, portal_name from tenants
       where (portal_name = ${under} or slug = ${under}) and portal_open = true
       order by (portal_name = ${under}) desc
       limit 1`;
    const found = rows[0];
    return found ? { ...found, portalName: found.portal_name } : null;
  }

  const rows = await owner()<
    { id: string; name: string; slug: string; portal_name: string | null }[]
  >`
    select id, name, slug, portal_name from tenants where custom_domain = ${bare} limit 1`;
  const found = rows[0];
  return found ? { ...found, portalName: found.portal_name } : null;
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
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

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

/**
 * R1.1, R17.1. Whether a church may have this name, and taking it.
 *
 * Checked against both columns, because a name that shadowed another church's
 * slug would take that church's address away from it.
 */
export async function portalNameFree(name: string, tenantId: string): Promise<boolean> {
  const bare = cleanPortalName(name);
  if (!bare || isReservedName(bare)) return false;

  const rows = await owner()<{ id: string }[]>`
    select id from tenants
     where (portal_name = ${bare} or slug = ${bare}) and id <> ${tenantId}
     limit 1`;
  return rows.length === 0;
}

export async function setPortalName(
  db: Tx,
  actor: WriteActor,
  input: { name: string | null },
): Promise<string | null> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const bare = input.name?.trim() ? cleanPortalName(input.name) : null;
  if (input.name?.trim() && !bare) throw new InvalidInputError("portal.error.shape");

  /* Ours, which is a different answer from somebody else having it. */
  if (bare && isReservedName(bare)) throw new InvalidInputError("portal.error.blocked");

  if (bare && !(await portalNameFree(bare, actor.tenantId))) {
    throw new NameTakenError("portal.error.taken", bare, actor.tenantId);
  }

  await db
    .update(tenants)
    .set({ portalName: bare })
    .where(eq(tenants.id, actor.tenantId));

  return bare;
}

/** R1.1, R17.1. Turning the church's address on, or off. */
export async function setPortalOpen(
  db: Tx,
  actor: WriteActor,
  open: boolean,
): Promise<boolean> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  await db.update(tenants).set({ portalOpen: open }).where(eq(tenants.id, actor.tenantId));
  return open;
}

/* The rules themselves, for everything that reads them from here. */
export {
  cleanDomain, slugUnderPlatform, cleanPortalName, isReservedName,
} from "./portal-rules";

/**
 * R1.1, R17.1. The name a church is reached at, for a page that knows its slug.
 *
 * A public address carries the slug, because that is what a church handed out
 * before it chose anything. What it is reached at now may be a name it picked
 * since, and may be nothing at all if it closed its address.
 */
export async function portalAddressFor(
  slug: string,
): Promise<{ slug: string; portalName: string | null; portalOpen: boolean } | null> {
  const rows = await owner()<
    { slug: string; portal_name: string | null; portal_open: boolean }[]
  >`
    select slug, portal_name, portal_open from tenants
     where slug = ${slug} and archived_at is null
     limit 1`;
  const found = rows[0];
  return found
    ? { slug: found.slug, portalName: found.portal_name, portalOpen: found.portal_open }
    : null;
}
