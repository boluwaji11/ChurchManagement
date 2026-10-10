import "server-only";
import { cookies } from "next/headers";

/**
 * R1.4, R17.1. Which church somebody in several of them is looking at.
 *
 * A church's own address names it, so on riverside.connectapp.church there is
 * nothing to carry and this is never read. Our own host is the other case:
 * somebody in two churches signs in at connectapp.church, picks one, and every
 * screen after that has to know which without the name riding in the query of
 * all 280 links on the way.
 *
 * It selects. It does not authorize. requireSession verifies the membership
 * against tenant_members for whatever name it is handed, exactly as it did for
 * the query parameter, so a cookie somebody edits by hand opens the chooser
 * rather than a church.
 */
const CHURCH = "church";

export async function readChurchChoice(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CHURCH)?.value?.trim() || null;
}

/** Remembered for a year, so a bookmark opens the church it was taken in. */
export async function rememberChurch(slug: string): Promise<void> {
  const jar = await cookies();
  jar.set(CHURCH, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function forgetChurch(): Promise<void> {
  const jar = await cookies();
  jar.delete(CHURCH);
}
