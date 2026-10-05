"use server";

import { cookies } from "next/headers";

export type Theme = "system" | "light" | "dark";

/** R24.x. Kept in a cookie so the server renders the right one on first paint. */
export async function setTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  if (theme === "system") {
    jar.delete("connectapp-theme");
    return;
  }
  jar.set("connectapp-theme", theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
