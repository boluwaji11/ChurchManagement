import "server-only";
import { headers } from "next/headers";
import { slugUnderPlatform } from "@connectapp/db/rules";
import { resolveTenantByHost, portalAddressFor } from "@connectapp/db";

/**
 * R1.1, R17.1. A church's own address, built from the request we are on.
 *
 * Every church reaches the product at a name under ours, so a link that takes
 * somebody into a church takes them to that name rather than to ours with the
 * church written in the query. Once they are there the address says which
 * church and nothing in the path has to.
 *
 * The scheme and the parent both come from the request, so it is the same
 * answer in development, in a preview and in production without any of them
 * being named here.
 */
export async function churchOrigin(name: string): Promise<string | null> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  if (!host) return null;

  const proto = head.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  /* Already on a church's address: the parent is what is left when its own
     name comes off. Otherwise the host is the parent. */
  const under = slugUnderPlatform(host);
  const parent = under ? host.slice(under.length + 1) : host;

  return `${proto}://${name}.${parent}`;
}

/** The whole way in: the church's address, and the screen they land on. */
export async function churchLanding(name: string, path: string): Promise<string> {
  const origin = await churchOrigin(name);
  return origin ? `${origin}${path}` : `${path}`;
}

/**
 * R1.1, R17.1. One address in use, and the other one points at it.
 *
 * A church answers at its slug from the day it signs up, and goes on
 * answering there after it picks a name of its own. Two live addresses for
 * one church is two of everything: two links to hand out, two things in a
 * search engine, and a card that can only show one of them.
 *
 * So the slug keeps working and sends people on. A link printed in a news
 * sheet last year still lands in the right place, and what the church reads
 * in the address bar afterwards is the name it chose.
 *
 * Null when the request is already where it belongs, which is nearly always.
 */
export async function canonicalAddress(): Promise<string | null> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  if (!host) return null;

  const under = slugUnderPlatform(host);
  if (!under) return null;

  const church = await resolveTenantByHost(host);
  // Already on the chosen name, or the church has not chosen one.
  if (!church?.portalName || church.portalName === under) return null;
  // Only the slug gives way. A name that matches neither reached nobody.
  if (under !== church.slug) return null;

  const proto = head.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const parent = host.slice(under.length + 1);
  const path = head.get("x-pathname") ?? "/";
  const query = head.get("x-search") ?? "";

  return `${proto}://${church.portalName}.${parent}${path}${query}`;
}

/**
 * R1.1, R17.1. Where a church's public page belongs, when it is not here.
 *
 * A public address carries the church's slug, because that is what a church
 * handed out on a card and in a news sheet before it chose anything. On the
 * church's own address the host already says the name, so the path saying it
 * again reads as riverside.connectapp.church/give/riverside.
 *
 * The short path answers on the church's address. Everywhere else the long
 * one sends people to it, keeping whatever query came with it.
 *
 * Null when the request is already where it belongs, and null when the church
 * has no address of its own, which is when the long path is all there is.
 */
export async function publicPath(slug: string, path: string): Promise<string | null> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  if (!host) return null;

  const church = await portalAddressFor(slug);
  // A church nobody can reach at a name of its own keeps the long path.
  if (!church?.portalOpen) return null;

  const name = church.portalName ?? church.slug;
  const query = head.get("x-search") ?? "";

  // Already on that church's address, so only the repeated name comes off.
  if (slugUnderPlatform(host) === name) return `${path}${query}`;

  const origin = await churchOrigin(name);
  return origin ? `${origin}${path}${query}` : null;
}

/**
 * R1.1, R17.1. A church's own origin, for a link built away from a request
 * for one of its pages.
 *
 * Null where the church has no address of its own, or has closed it, which is
 * when a link has to carry the slug in the path instead.
 */
export async function publicOrigin(slug: string): Promise<string | null> {
  const church = await portalAddressFor(slug);
  if (!church?.portalOpen) return null;
  return churchOrigin(church.portalName ?? church.slug);
}

/**
 * R1.1, R17.1. A whole public address, in whichever shape the church has.
 *
 * The church's own address with the short path where it has one, and ours
 * with the church in the path where it does not. The same two shapes the
 * public routes answer on, built in one place so a card a church prints and
 * the link it copies cannot disagree.
 */
export async function publicLink(
  slug: string,
  section: string,
  rest = "",
): Promise<string> {
  const home = await publicOrigin(slug);
  if (home) return `${home}/${section}${rest}`;

  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}/${section}/${slug}${rest}`;
}
