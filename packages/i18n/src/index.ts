import { en } from "./messages/en";
import { readerFor } from "./core";

/**
 * R22.8, R20.1. Every word, for the server.
 *
 * What a church reads on a screen is a fraction of what this product writes:
 * the rest is emails, giving statements, printed sheets, the importer's
 * refusals and the words a job queue puts in a notification. All of it is
 * rendered on the server, so all of it lives here, and the browser is handed
 * the smaller catalogue beside this one.
 *
 * This is what anything outside a browser gets, through `default` in the
 * package's exports: a server component, a route handler, a server action, the
 * job worker, a script, a test. Only a bundle built for a browser resolves to
 * `client.ts`, through the `browser` condition.
 *
 * It was the other way round for an afternoon, keyed on `react-server`, and CI
 * found what that misses: the data layer builds its error messages here and
 * runs under plain Node, where no such condition is set, so two of them came
 * back as `merge.error.tooOld` rather than as the sentence a church reads.
 */
const reader = readerFor(en);

export const t = reader.t;
export const plural = reader.plural;

export { en };
export * from "./core";
