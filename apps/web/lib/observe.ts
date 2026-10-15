import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { setTenantObserver } from "@connectapp/db";

/**
 * R24.11, N3. What the server spent, written where the deployment can read it.
 *
 * Every performance story in this release was measured by hand, against a
 * seeded church on a laptop, with the database on the same desk. That is how
 * the two worst findings stayed hidden for weeks: `photoUrls` could never hit
 * its cache, and the frame was rebuilt on every press. Neither was visible by
 * reading the code, and neither is visible in Vercel's own numbers, which say a
 * page was slow and nothing about which church or which read.
 *
 * So a transaction that runs long says so, once, as a line of JSON: the
 * address, the church, the role, and the milliseconds. One line rather than a
 * tracing library, because a line goes wherever the logs already go, costs
 * nothing when nothing is slow, and cannot become the reason a church's write
 * fails.
 *
 * What it never carries: a name, an email, a note, a gift. A church's id and
 * the address somebody was on, which is what answers "what is slow, for whom".
 */

/** Below this, a transaction is ordinary and says nothing. */
const SLOW_MS = Number(process.env["SLOW_QUERY_MS"] ?? 400);

/** Reports every transaction, which is what a measuring run wants. */
const EVERYTHING = process.env["OBSERVE_EVERY_QUERY"] === "1";

/**
 * The address this request is on, held for the length of it.
 *
 * `cache` gives one object per request and a different one for the next, which
 * is what makes this safe on a server rendering two churches at once. A module
 * variable would be the same object for both, and a line would name whichever
 * screen happened to be rendering alongside.
 */
const store = cache((): { at: string | null } => ({ at: null }));

/** Called by the frame, where a request first knows its own address. */
export async function noteThePage(): Promise<void> {
  try {
    store().at = (await headers()).get("x-pathname");
  } catch {
    // Outside a request there is no address, and the lines say so.
  }
}

let watching = false;

/**
 * Starts watching, once per server process.
 *
 * Called from the frame, which every screen renders, so there is one place that
 * turns it on and no screen has to remember to.
 */
export function watchTheDatabase(): void {
  if (watching) return;
  watching = true;

  setTenantObserver(({ tenantId, role, ms, failed }) => {
    if (!failed && !EVERYTHING && ms < SLOW_MS) return;

    let at: string | null = null;
    try {
      at = store().at;
    } catch {
      // The queue worker has no request around it. The line is still worth it.
    }

    console.log(JSON.stringify({
      watch: "db",
      at,
      church: tenantId,
      role,
      ms,
      ...(failed ? { failed: true } : {}),
    }));
  });
}
