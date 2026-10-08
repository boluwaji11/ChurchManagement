/**
 * R22.8. The locale this church writes its dates and numbers in.
 *
 * A registry rather than a value, for the reason the spelling beside it is
 * one: a server renders two churches at once and a module variable would
 * hand the second one whatever the first set. The server registers a
 * resolver that reads a per-request store; the browser, which shows one
 * church at a time, registers one that reads a plain variable.
 */
let reads: () => string = () => "en-GB";

/** Registered by the server's own store, and by the provider in the browser. */
export function setReadingLocale(resolve: () => string): void {
  reads = resolve;
}

export function readingLocale(): string {
  try {
    return reads();
  } catch {
    // Outside a request, which is where a script or a test reads one.
    return "en-GB";
  }
}
