import { sql } from "drizzle-orm";
import type { Tx } from "../client";

/**
 * R1.10. The signed-in user's own sessions, and remote revoke.
 *
 * Supabase Auth owns these records in a schema the application role cannot
 * read. Reaching them with the service role key would put that key in a request
 * path, which is the one thing it may never be in, so this goes through two
 * security-definer functions that narrow every answer to the caller. See the
 * end of sql/security.sql.
 *
 * Both functions are absent where the auth schema is, which is CI and any plain
 * Postgres. That is reported rather than thrown, so a page can say the feature
 * is unavailable instead of failing.
 */

export interface UserSession {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  userAgent: string | null;
  ip: string | null;
}

/**
 * Whether this database has the session functions at all.
 *
 * Asked before calling them rather than catching the error afterwards. Every
 * repository call runs inside a transaction, and a statement that fails aborts
 * it: the catch would return cleanly and the commit would then throw, which is
 * a failure a long way from its cause.
 */
export async function sessionsAvailable(db: Tx): Promise<boolean> {
  const rows = await db.execute<{ present: boolean }>(
    sql`select to_regprocedure('public.my_sessions()') is not null as present`,
  );
  return Boolean((rows as unknown as { present: boolean }[])[0]?.present);
}

export async function listSessions(db: Tx): Promise<UserSession[] | null> {
  if (!(await sessionsAvailable(db))) return null;

  const rows = await db.execute<{
    id: string; created_at: string; refreshed_at: string;
    user_agent: string | null; ip: string | null;
  }>(sql`select * from public.my_sessions()`);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r["id"]),
    createdAt: new Date(String(r["created_at"])),
    lastSeenAt: new Date(String(r["refreshed_at"])),
    userAgent: (r["user_agent"] as string | null) ?? null,
    ip: (r["ip"] as string | null) ?? null,
  }));
}

/**
 * Ends one session.
 *
 * The function matches on the caller's own user id as well as the session id,
 * so a guessed id revokes nothing. It returns how many rows went, which is zero
 * for a session that belongs to somebody else and zero for one that has already
 * expired. Both are reported the same way, because telling the difference would
 * confirm that a given session id exists.
 */
export async function revokeSession(db: Tx, sessionId: string): Promise<number> {
  if (!(await sessionsAvailable(db))) return 0;

  const rows = await db.execute<{ revoke_session: number }>(
    sql`select public.revoke_session(${sessionId}::uuid) as revoke_session`,
  );
  return Number((rows as unknown as { revoke_session: number }[])[0]?.revoke_session ?? 0);
}

/** Ends every session except the one asking. */
export async function revokeOtherSessions(db: Tx, keepSessionId: string): Promise<number> {
  const sessions = await listSessions(db);
  if (!sessions) return 0;

  let ended = 0;
  for (const session of sessions) {
    if (session.id === keepSessionId) continue;
    ended += await revokeSession(db, session.id);
  }
  return ended;
}

/**
 * A device, as a person would name it.
 *
 * Parsed here rather than in the page, because "Chrome on a Mac" is the only
 * part of a user agent string anybody can act on, and the rest of it on screen
 * reads as noise. An unknown agent is reported as unknown.
 */
export function describeDevice(userAgent: string | null): { browser: string; platform: string } {
  const ua = userAgent ?? "";
  if (!ua) return { browser: "unknown", platform: "unknown" };

  const browser =
    /\bEdg\//.test(ua) ? "Edge"
    : /\bOPR\//.test(ua) ? "Opera"
    : /\bFirefox\//.test(ua) ? "Firefox"
    : /\bChrome\//.test(ua) ? "Chrome"
    : /\bSafari\//.test(ua) ? "Safari"
    : "unknown";

  const platform =
    /\biPhone\b/.test(ua) ? "iPhone"
    : /\biPad\b/.test(ua) ? "iPad"
    : /\bAndroid\b/.test(ua) ? "Android"
    : /\bMac OS X\b|\bMacintosh\b/.test(ua) ? "Mac"
    : /\bWindows\b/.test(ua) ? "Windows"
    : /\bLinux\b/.test(ua) ? "Linux"
    : "unknown";

  return { browser, platform };
}
