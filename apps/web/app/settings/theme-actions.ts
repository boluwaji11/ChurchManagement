"use server";

import { cookies } from "next/headers";

export type Theme = "system" | "light" | "dark";

/**
 * R24.x. Kept in a cookie so the server renders the right one on first paint.
 *
 * "system" is written down rather than removing the cookie, because no cookie
 * and a cookie reading system are two different things: ConnectApp's own
 * website opens dark for somebody who has never chosen, and follows the
 * device for somebody who has asked it to.
 */
export async function setTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  jar.set("connectapp-theme", theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
