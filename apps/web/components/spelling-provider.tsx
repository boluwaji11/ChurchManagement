"use client";

import * as React from "react";
import { setSpellingResolver, type Spelling } from "@connectapp/i18n";

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

export function SpellingProvider({
  spelling: next,
  children,
}: {
  spelling: Spelling;
  children: React.ReactNode;
}) {
  spelling = next;
  return <>{children}</>;
}
