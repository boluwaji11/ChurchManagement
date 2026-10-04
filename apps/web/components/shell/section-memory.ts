"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { activeHref, type NavTarget } from "./nav-active";

const KEY = "hearth:section";

/**
 * A path segment that is an id rather than a screen.
 *
 * A record's page is not where a section reopens: pressing Groups means the
 * groups, not the one group somebody happened to read last. Everything else in
 * a section is a screen, and a screen is worth coming back to.
 */
const RECORD = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i;

/**
 * R24.6. Where you were, the last time you were in this section.
 *
 * Pressing People, going to Settings and pressing People again should put
 * somebody back on the screen they left, with the page and the filters they
 * had, rather than at the top of a list they already scrolled past. Settings is
 * the sharpest case: its entry points at a section with ten screens in it.
 *
 * A record's own page is the exception. Pressing Groups means the groups, not
 * the one group somebody read last, so a record leaves the section pointing at
 * its list.
 *
 * Held in sessionStorage, so it lasts as long as the tab and never follows
 * anybody to another device. Every read and write is guarded: a private window
 * can refuse both, and a sidebar that throws is worse than one that forgets.
 */
function read(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function write(all: Record<string, string>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // A browser that will not store it is a browser that does not remember.
  }
}

/**
 * Records the current screen against the section it belongs to, and answers
 * where a given section should reopen.
 */
export function useSectionMemory(entries: NavTarget[]) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();

  React.useEffect(() => {
    const section = activeHref(entries, pathname);
    if (!section) return;

    const all = read();
    // A record's own page leaves the section pointing at its list, so coming
    // back lands somewhere that still makes sense tomorrow.
    all[section] = RECORD.test(pathname)
      ? section
      : query
        ? `${pathname}?${query}`
        : pathname;
    write(all);
    // entries is rebuilt on every render of the server component above, so it
    // is deliberately not a dependency: the path and the query are what change.
  }, [pathname, query]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Where a section should reopen, or null for the screen it names.
   *
   * Read when the link is pressed rather than while it renders: the server has
   * no sessionStorage, so an href computed from it would not match what the
   * browser draws and the tree would fail to hydrate.
   */
  return React.useCallback((href: string): string | null => {
    const remembered = read()[href];
    if (remembered === href) return null;
    // Only within the section it was recorded for. A stale entry pointing
    // somewhere else would send somebody to a screen they did not press.
    if (remembered && (remembered === href || remembered.startsWith(`${href}/`)
      || remembered.startsWith(`${href}?`))) {
      return remembered;
    }
    return null;
  }, []);
}
