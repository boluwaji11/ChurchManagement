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
 * Resolved through the `react-server` condition, so a server component gets
 * this file and a client component gets `client.ts` without either of them
 * importing anything different.
 */
const reader = readerFor(en);

export const t = reader.t;
export const plural = reader.plural;

export { en };
export * from "./core";
