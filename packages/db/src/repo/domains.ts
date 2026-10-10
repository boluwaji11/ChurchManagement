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
 * R1.1, R17.1. Our own host, which every church gets a name under.
 *
 * `riverside.connectapp.church` is where Riverside's members sign in. It needs
 * nothing from the church: we own the name, we hold the certificate, and the
 * church is named by the slug it already has.
 */
const platformHost = (): string =>
  (process.env["PLATFORM_HOST"] ?? "connectapp.church").trim().toLowerCase();

/**
 * Names under ours that are the platform rather than a church.
 *
 * A church whose slug was `www` would otherwise take the front door with it.
 */
const RESERVED = new Set([
  // Ours. A church at connectapp.connectapp.church reads as the product
  // rather than as the church.
  "connectapp", "connect", "app", "apps", "www", "web", "portal", "go", "my",
  "home", "main", "root",

  // The routes and the infrastructure under them.
  "api", "admin", "administrator", "dashboard", "auth", "login", "signin",
  "signup", "register", "join", "account", "accounts", "settings", "static",
  "assets", "cdn", "media", "files", "img", "images", "js", "css", "ws",
  "socket", "graphql", "webhook", "webhooks", "callback", "oauth", "sso",
  "health", "ping", "metrics", "internal",

  // Mail. A church holding autodiscover or mx would answer for our own
  // domain to somebody's mail client, which is the one kind of collision
  // nobody would think to look for.
  "mail", "email", "smtp", "imap", "pop", "pop3", "mx", "ns", "ns1", "ns2",
  "dns", "autodiscover", "autoconfig", "mta-sts", "postmaster", "abuse",
  "noreply", "no-reply", "bounce", "bounces", "dmarc", "spf", "dkim",

  // Where the product is worked on, so these stay ours to use.
  "test", "testing", "example", "demo", "dev", "development", "stage",
  "staging", "sandbox", "preview", "beta", "alpha", "local", "localhost",
  "tmp", "temp", "qa",

  // Anything that would read as the company speaking.
  "support", "help", "helpdesk", "status", "security", "billing", "payments",
  "invoice", "invoices", "legal", "privacy", "terms", "press", "careers",
  "jobs", "blog", "docs", "documentation", "news", "about", "contact",
  "team", "staff", "official", "verify", "verified", "trust",

  // Money. A church at give.connectapp.church looks like our giving page
  // rather than theirs, and that is the one shape somebody could collect
  // under our name with.
  "give", "giving", "donate", "donation", "donations", "tithe", "tithes",
  "offering", "offerings", "pay", "checkout",
]);

/**
 * R1.1. The church named by a host under ours, if it is one.
 *
 * Returns the slug rather than looking it up, so the rule is one pure thing
 * that can be read and tested without a database.
 */
export function slugUnderPlatform(host: string, platform = platformHost()): string | null {
  const bare = (cleanDomain(host) ?? "").trim();
  if (!bare) return null;

  // Localhost always counts, so a church can be opened at
  // riverside.localhost while somebody is working on it.
  const roots = [platform, "localhost"];
  for (const root of roots) {
    if (!root || bare === root || !bare.endsWith(`.${root}`)) continue;
    const label = bare.slice(0, bare.length - root.length - 1);
    // One label deep. Anything further is not a church's address.
    if (!label || label.includes(".") || RESERVED.has(label)) return null;
    return label;
  }
  return null;
}

/**
 * R1.1. What a church may call its members' address.
 *
 * Lower case letters, digits and hyphens, because it is typed by a
 * congregation and read aloud from a notice sheet. Three characters at least,
 * so the short ones stay available, and forty at most, because an address
 * nobody can say is an address nobody uses.
 */
const PORTAL_NAME = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

export function cleanPortalName(value: string): string | null {
  const bare = value.trim().toLowerCase();
  return PORTAL_NAME.test(bare) ? bare : null;
}

/**
 * R17.1. Whether this is one of ours.
 *
 * Asked apart from the shape, because "that is not a name" and "that name is
 * not yours to take" are different things to be told and a church told the
 * first about the second goes on trying to fix the spelling.
 */
export const isReservedName = (name: string): boolean =>
  RESERVED.has(name.trim().toLowerCase());

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

  /* R1.1. A name under ours names the church by its own slug, which is the
     address every church has without doing anything. */
  const under = slugUnderPlatform(bare);
  if (under) {
    /* The name the church chose, or its slug, which answers from the day it
       signs up and goes on answering after a name is chosen. */
    /* R17.1. A church that has turned its address off is not reachable at
       it, so the host names nobody. */
    const rows = await owner()<{ id: string; name: string; slug: string }[]>`
      select id, name, slug from tenants
       where (portal_name = ${under} or slug = ${under}) and portal_open = true
       order by (portal_name = ${under}) desc
       limit 1`;
    return rows[0] ?? null;
  }

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
