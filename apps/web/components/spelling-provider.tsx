"use client";

import * as React from "react";
import { setSpellingResolver, type Spelling } from "@connectapp/i18n";
import { setReadingLocale } from "@/lib/reading-locale";

/**
 * R22.8. The same spelling, in the browser.
 *
 * A module variable is safe here in a way it is not on the server: a browser
 * shows one church at a time. It is set while the module evaluates rather than
 * in an effect, so the first client render already reads the right words and
 * there is nothing for React to find different between the two.
 */
let spelling: Spelling = "british";
setSpellingResolver(() => spelling);

/** R22.8. The locale this church's dates and numbers are written in. */
let locale = "en-GB";
setReadingLocale(() => locale);

export function SpellingProvider({
  spelling: next,
  locale: reads,
  children,
}: {
  spelling: Spelling;
  /** From the country on the church's record, never from the browser. */
  locale: string;
  children: React.ReactNode;
}) {
  spelling = next;
  locale = reads;
  return <>{children}</>;
}
