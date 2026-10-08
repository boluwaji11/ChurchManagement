import { eq } from "drizzle-orm";
import { owner } from "../client";
import { appUsers } from "../schema/tenancy";
import { drizzle } from "drizzle-orm/postgres-js";

/**
 * R24.x, R17.2. What a person keeps about themselves, across every church.
 *
 * An account is not a church's record, so these sit on `app_users` rather than
 * on a member, and they are read on the raw connection: somebody choosing a
 * palette on the sign-in screen has no tenant yet, and somebody who belongs to
 * two churches keeps one answer rather than two.
 */

export type UserTheme = "system" | "light" | "dark";

const KNOWN: UserTheme[] = ["system", "light", "dark"];

/** Their palette, or null where they have never chosen. */
export async function themeFor(userId: string): Promise<UserTheme | null> {
  const db = drizzle(owner());
  const [row] = await db
    .select({ theme: appUsers.theme })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);

  const held = row?.theme;
  return held && KNOWN.includes(held as UserTheme) ? (held as UserTheme) : null;
}

/**
 * R24.x. Remembers the choice against the person who made it.
 *
 * Quietly does nothing for an id with no account row yet, which is the moment
 * between a first sign-in and the row being written.
 */
export async function setThemeFor(userId: string, theme: UserTheme): Promise<void> {
  if (!KNOWN.includes(theme)) return;
  const db = drizzle(owner());
  await db.update(appUsers).set({ theme }).where(eq(appUsers.id, userId));
}
