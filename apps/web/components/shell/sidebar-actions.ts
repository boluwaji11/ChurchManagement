"use server";

import { cookies } from "next/headers";
import { SIDEBAR_COOKIE } from "./sidebar-cookie";

/**
 * R24.6. Whether the sidebar is collapsed.
 *
 * Kept in a cookie for the same reason the theme is: the server renders it at
 * the width it was left at, so nobody watches the navigation shrink after the
 * page has already drawn.
 */
export async function setSidebarCollapsed(collapsed: boolean): Promise<void> {
  const jar = await cookies();
  if (!collapsed) {
    jar.delete(SIDEBAR_COOKIE);
    return;
  }
  jar.set(SIDEBAR_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
