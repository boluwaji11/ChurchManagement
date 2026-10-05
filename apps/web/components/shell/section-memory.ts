"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { activeHref, type NavTarget } from "./nav-active";

const KEY = "hearth:section";

/**
 * R24.6. Where you were, the last time you were in this section.
 *
 * Pressing People, going to Settings and pressing People again should put
 * somebody back on the screen they left, with the page and the filters they
 * had, rather than at the top of a list they already scrolled past. Settings is
 * the sharpest case: its entry points at a section with ten screens in it.
 *
 * A record's own page counts: somebody reading a person, checking a setting and
 * pressing People again means that person, not the directory they already found
 * them in.
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
    all[section] = query ? `${pathname}?${query}` : pathname;
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
  return React.useCallback(
    (href: string): string | null => {
      const remembered = read()[href];
      if (!remembered || remembered === href) return null;

      /*
       * Only somewhere this section actually owns. A section's entry is not
       * always its root: Settings points at /settings/church while owning the
       * whole of /settings, and People owns Duplicates and Import. Checking
       * against the href alone threw those away, which is why Settings kept
       * reopening at the top.
       */
      const owns = entries.find((one) => one.href === href)?.owns ?? [href];
      const inside = owns.some(
        (prefix) =>
          remembered === prefix ||
          remembered.startsWith(`${prefix}/`) ||
          remembered.startsWith(`${prefix}?`),
      );

      return inside ? remembered : null;
    },
    // Rebuilt on every render of the server component above, and only its
    // hrefs are read, which do not change between renders.
    [entries], // eslint-disable-line react-hooks/exhaustive-deps
  );
}

/**
 * Forgets where one section was left.
 *
 * Pressing the section you are already in means "take me to the top of this",
 * so the memory has to go with it. Without this the press would navigate to the
 * root and the next press would bounce straight back to the record you were
 * trying to leave.
 */
export function forgetSection(href: string): void {
  const all = read();
  delete all[href];
  write(all);
}

/**
 * Forgets every section.
 *
 * Signing out ends the session, and the next person at this keyboard should
 * open People on the directory rather than on a stranger's record. The tab
 * closing clears it on its own, because this is sessionStorage.
 */
export function clearSectionMemory(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored is nothing to clear.
  }
}
