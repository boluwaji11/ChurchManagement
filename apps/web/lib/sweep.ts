import "server-only";
import { withTenant, getChurch, sweepFollowUps } from "@connectapp/db";
import { churchNow } from "@/lib/church-now";

/**
 * R5.3. Running the follow-up triggers off the back of an attendance write.
 *
 * The acceptance criterion gives it one minute from a first attendance being
 * recorded, so it runs where the recording happens. A volunteer ticking forty
 * names should not pay for forty sweeps, so each church is swept at most once a
 * minute and the rest return immediately.
 *
 * The sweep counts from the attendance record and skips anybody already raised,
 * so running it twice costs two queries and changes nothing. When the job
 * queue lands this moves on to it unchanged.
 */
const WINDOW_MS = 60_000;
const lastRun = new Map<string, number>();

export async function sweepAfterAttendance(ctx: {
  tenantId: string;
  role: string;
  userId?: string | null;
}): Promise<void> {
  const at = Date.now();
  if (at - (lastRun.get(ctx.tenantId) ?? 0) < WINDOW_MS) return;
  lastRun.set(ctx.tenantId, at);

  try {
    await withTenant(ctx as never, async (tx) => {
      const profile = await getChurch(tx, ctx.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      return sweepFollowUps(tx, ctx.tenantId, { today });
    });
  } catch {
    // A follow-up that could not be raised must never cost somebody their
    // attendance record. The next tick sweeps again.
    lastRun.delete(ctx.tenantId);
  }
}
