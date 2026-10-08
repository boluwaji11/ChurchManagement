"use server";

import { cookies } from "next/headers";
import { setThemeFor } from "@connectapp/db";
import { currentUser } from "@/lib/session";

export type Theme = "system" | "light" | "dark";

/**
 * R24.x, R17.2. Remembers which palette somebody reads in.
 *
 * Two places, for two reasons. It goes on the person's account, so a choice
 * made on the church laptop is waiting on their phone and nobody sets it
 * twice. It also goes in a cookie, because the server has to know which
 * palette to paint before it has looked anything up, and because somebody
 * reading the website has no account to keep it on.
 *
 * "system" is written down rather than clearing the cookie: no choice and a
 * choice of the device are different answers, and ConnectApp's own pages open
 * dark for the first while a church's screens open light.
 */
export async function setTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  jar.set("connectapp-theme", theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const who = await currentUser();
  if (who) await setThemeFor(who.id, theme);
}
