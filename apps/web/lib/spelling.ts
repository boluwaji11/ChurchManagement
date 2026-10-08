import { cache } from "react";
import { setSpellingResolver, spellingFor, localeFor, type Spelling } from "@connectapp/i18n";
import { setReadingLocale } from "./reading-locale";

/**
 * R22.8. Which spelling this request reads, held for the length of it.
 *
 * `cache` gives one object per request and a different one for the next, which
 * is what makes this safe on a server rendering two churches at once. A module
 * variable would be the same object for both, and a church in Missouri would
 * read whatever the church in Manchester set a moment earlier.
 *
 * Read lazily, inside the resolver, because the value is set while the page
 * loads its session and the strings are read afterwards.
 */
const store = cache((): { spelling: Spelling; locale: string } => ({
  spelling: "british",
  locale: "en-GB",
}));

/** Called once a request knows whose church it is. */
export function readsAs(country: string | null | undefined): void {
  store().spelling = spellingFor(country);
  store().locale = localeFor(country);
}

/*
 * R22.8. The same arrangement for the locale, registered at import so a date
 * written anywhere on the server reads the church it belongs to.
 */
setReadingLocale(() => store().locale);

/*
 * Registered at import. Every server render reaches this module through the
 * shell, and a `t()` that somehow runs outside a request gets the catalogue as
 * written, because `cache` throws there and the resolver answers with that.
 */
setSpellingResolver(() => store().spelling);
