import { Resolver as NodeResolver } from "node:dns/promises";
import type { Resolver } from "./preflight";

/**
 * HRT-283, R22.2. The real lookup, kept apart from everything that reads it.
 *
 * Public resolvers rather than whatever the machine is configured with, so the
 * answer is the same from a laptop, from a container and from a deploy. A
 * church being told its domain looks different depending on where the server
 * happens to be running is a church that stops believing the screen.
 *
 * Short timeout and one retry. This runs while somebody watches a spinner, and
 * a domain that does not answer in three seconds is a domain we report as
 * quiet rather than one we wait on.
 */
const PUBLIC_RESOLVERS = ["1.1.1.1", "8.8.8.8"];

export function dnsResolver(): Resolver {
  const node = new NodeResolver({ timeout: 3000, tries: 2 });
  node.setServers(PUBLIC_RESOLVERS);

  return {
    mx: (host) => node.resolveMx(host),
    txt: (host) => node.resolveTxt(host),
    ns: (host) => node.resolveNs(host),
    cname: (host) => node.resolveCname(host),
  };
}
