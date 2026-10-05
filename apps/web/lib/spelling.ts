import { cache } from "react";
import { setSpellingResolver, spellingFor, type Spelling } from "@hearth/i18n";

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
const store = cache((): { spelling: Spelling } => ({ spelling: "british" }));

/** Called once a request knows whose church it is. */
export function readsAs(country: string | null | undefined): void {
  store().spelling = spellingFor(country);
}

/*
 * Registered at import. Every server render reaches this module through the
 * shell, and a `t()` that somehow runs outside a request gets the catalogue as
 * written, because `cache` throws there and the resolver answers with that.
 */
setSpellingResolver(() => store().spelling);
