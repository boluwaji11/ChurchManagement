"use server";

import { cookies } from "next/headers";
import { RAIL_COOKIE } from "./rail-cookie";

/**
 * HRT-393. Whether the rail is collapsed.
 *
 * Kept in a cookie rather than in component state, so the server renders the
 * frame at the width it was left at and nobody watches the navigation shrink
 * after the page has already drawn. Not httpOnly: the value is a preference
 * about a width, and the browser reads it too.
 */
export async function setRailCollapsed(collapsed: boolean): Promise<void> {
  const jar = await cookies();
  if (!collapsed) {
    jar.delete(RAIL_COOKIE);
    return;
  }
  jar.set(RAIL_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
