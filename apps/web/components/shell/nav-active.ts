/**
 * Which nav entry the current path sits under.
 *
 * Pure, and imported by the sidebar, which runs in the browser. Nothing here
 * may reach for the database or a node built-in: `@hearth/db` pulls in
 * `node:crypto` and webpack refuses to build a client component that does.
 */
export interface NavTarget {
  href: string;
  /** The routes this entry lights up for, beyond its own. */
  owns?: string[];
}

/**
 * Longest match wins, so `/checkin/rooms` lights its own entry rather than
 * Check-in, while `/members/abc/edit` still lights People.
 */
export function activeHref(entries: NavTarget[], pathname: string): string | null {
  let best: { href: string; depth: number } | null = null;

  for (const entry of entries) {
    for (const prefix of entry.owns ?? [entry.href]) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue;
      const depth = prefix.split("/").length;
      if (!best || depth > best.depth) best = { href: entry.href, depth };
    }
  }
  return best?.href ?? null;
}
