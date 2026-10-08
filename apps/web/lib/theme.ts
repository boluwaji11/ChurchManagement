import { cookies, headers } from "next/headers";
import { themeFor } from "@connectapp/db";
import type { Theme } from "@/app/settings/theme-actions";

/**
 * The addresses that are ConnectApp's own rather than a church's.
 *
 * The website and the way in. Everything else is a church at work, including
 * a church's own public pages, which stay as their visitors' devices ask.
 */
const OURS = ["/", "/trust", "/sign-in", "/sign-up", "/reset"];

/**
 * R24.x. Which palette a surface opens in.
 *
 * Two surfaces with two different defaults. ConnectApp's own website opens
 * dark, because that is how the product presents itself. The platform opens
 * light, because that is what a church office is lit like and what a volunteer
 * expects of a working screen.
 *
 * A choice beats both. "Match my device" is written down rather than removing
 * the cookie, so somebody who has asked for the device is told apart from
 * somebody who has never chosen, and each surface can keep its own default for
 * the second of those.
 *
 * `attr` is what goes on the element: a theme name to hold a subtree to one
 * palette, or nothing at all, which leaves the media query to decide.
 */
async function held(): Promise<string | undefined> {
  return (await cookies()).get("connectapp-theme")?.value;
}

const settled = (
  value: string | undefined,
  fallback: "light" | "dark",
): { chosen: Theme; attr: "light" | "dark" | undefined } => {
  if (value === "light" || value === "dark") return { chosen: value, attr: value };
  if (value === "system") return { chosen: "system", attr: undefined };
  return { chosen: fallback, attr: fallback };
};

/** ConnectApp's own pages: the website, and the way in. */
export async function siteTheme() {
  return settled(await held(), "dark");
}

/** Everything a church works in. */
export async function appTheme() {
  return settled(await held(), "light");
}

/**
 * R24.x. What the document itself wears, which is the only place it can go.
 *
 * A dialog, a tooltip and a dropdown are drawn at the end of the body rather
 * than inside the screen that opened them, so a theme held on a div leaves
 * every one of them in the other palette. The root reads the address through
 * the header the middleware sets and answers for the whole document.
 */
export async function documentTheme() {
  const path = (await headers()).get("x-pathname") ?? "";
  const ours = OURS.includes(path);
  return settled(await held(), ours ? "dark" : "light");
}

/**
 * R24.x, R17.2. Brings the person's own choice onto this device.
 *
 * Called on the way in. The palette lives on their account so it follows them
 * between the church laptop and their phone, and the cookie is what the
 * server paints the first screen from, so signing in on a new device has to
 * copy one to the other. Somebody who has never chosen is left alone, and
 * each surface keeps its own default for them.
 */
export async function adoptTheme(userId: string): Promise<void> {
  const held = await themeFor(userId);
  if (!held) return;

  (await cookies()).set("connectapp-theme", held, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
