/**
 * R24.6. The way back a window carries, checked.
 *
 * A window over a list keeps the list's own address, filters and all, so
 * closing lands where the reader was. The address arrives in the query string,
 * where anybody can write it, so it is read as a path on this site under the
 * list it claims to be, and anything else becomes the plain list.
 */
export function returnToList(value: unknown, list: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return list;
  }

  const origin = "https://connectapp.local";
  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin || destination.pathname !== list) return list;
    return `${destination.pathname}${destination.search}`;
  } catch {
    return list;
  }
}

/** The filters inside a way back, as a page's own search params. */
export function filtersIn(back: string): Record<string, string> {
  const query = back.split("?")[1];
  return query ? Object.fromEntries(new URLSearchParams(query)) : {};
}

/**
 * R24.6. The same, for a window whose way back is a record rather than a list.
 *
 * The edit form closes onto the group it edits, so the path it may return to
 * is anything under the area rather than the one list address.
 */
export function returnToUnder(value: unknown, area: string, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  const origin = "https://connectapp.local";
  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin) return fallback;
    const path = destination.pathname;
    if (path !== area && !path.startsWith(`${area}/`)) return fallback;
    return `${path}${destination.search}`;
  } catch {
    return fallback;
  }
}
