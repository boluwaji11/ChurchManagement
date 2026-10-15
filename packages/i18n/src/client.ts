import { browserWords } from "./messages/client";
import { readerFor } from "./core";

/**
 * R20.1, R24.11. The words the browser is given.
 *
 * A client component that imports `t` pulls in whatever `t` imports, so one
 * component asking for one word used to put the whole catalogue in the bundle:
 * 4,729 keys, 67KB over the wire, most of them words a church only ever meets
 * in an email or on a printed sheet.
 *
 * Reached through the `browser` condition, which a bundler sets only for the
 * bundle it is building for a browser. Everything else, including the server
 * components that render those same screens, reads the whole catalogue.
 *
 * `messages/client.ts` is generated from the screens themselves, by
 * `scripts/build-client-catalogue.mjs`, and committed. A key a client file
 * names, and every key in a group whose keys it builds at runtime, is in it.
 * The test beside it fails if the file is stale, which is what stops a screen
 * asking for a word the browser was not given.
 */
const reader = readerFor(browserWords);

export const t = reader.t;
export const plural = reader.plural;

export * from "./core";
