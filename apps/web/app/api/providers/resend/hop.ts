import "server-only";
import { headers } from "next/headers";
import { slugUnderPlatform } from "@connectapp/db/rules";

/**
 * HRT-288, R16.1, R1.4. The two hosts this handshake runs across.
 *
 * Resend sends the church back to one registered address, and ours is on the
 * parent: `connectapp.church`, or `localhost:4488` while we are working. The
 * church itself is at a name underneath that, where its session cookie lives,
 * and in development that cookie is host-only, so the address Resend returns
 * to cannot read it.
 *
 * So the landing is a doorstep. It takes the code, works out which church
 * asked, and hands it on to that church's own address, where there is a
 * session and where the verifier is waiting in a cookie.
 */

/** Where we are, as a browser would write it. */
export async function here(): Promise<{ proto: string; host: string; parent: string }> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto =
    head.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  const under = slugUnderPlatform(host);
  return { proto, host, parent: under ? host.slice(under.length + 1) : host };
}

/** The one address registered with Resend, which is always on the parent. */
export async function redirectUri(): Promise<string> {
  const { proto, parent } = await here();
  return `${proto}://${parent}/api/providers/resend/callback`;
}

/**
 * R1.4. Whether a host named in the handshake is one of ours.
 *
 * The church's address travels through Resend and comes back, which means it
 * comes back from outside. A host that is not a name under this very parent is
 * refused, because sending somebody on to whatever the query asked for is how
 * a login screen ends up on a stranger's domain.
 */
export function ours(asked: string, parent: string): boolean {
  if (!asked || asked === parent) return true;
  const under = slugUnderPlatform(asked);
  return under !== null && asked.slice(under.length + 1) === parent;
}
