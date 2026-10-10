import "server-only";
import { headers } from "next/headers";
import { slugUnderPlatform } from "@connectapp/db/rules";

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
