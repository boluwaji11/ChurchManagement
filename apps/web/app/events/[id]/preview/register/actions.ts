"use server";

import {
  withTenant, getChurch, getEvent, registerForEvent, canManageEvents,
  type Registrant,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { explain } from "@/lib/explain";

/**
 * R14.2. Taking a place from the church's own preview of a draft.
 *
 * The whole path runs, matching and all, so what a church tries is what the
 * congregation will meet. The places are flagged as trials and cleared the
 * moment the event is published, which is why this needs a session: nobody
 * outside the church can reach a draft, let alone book against one.
 */
export async function registerFromPreview(input: {
  eventId: string;
  party: Registrant[];
  church?: string;
}): Promise<{
  ok: boolean;
  going?: number;
  waiting?: number;
  errors?: { at: number; fieldId: string; message: string }[];
  error?: string;
}> {
  const session = await requireSession(input.church);
  if (!canManageEvents(session)) return { ok: false, error: "forbidden" };

  try {
    const found = await withTenant(
      { tenantId: session.tenantId, role: session.role },
      async (tx) => ({
        event: await getEvent(tx, input.eventId),
        timezone: (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
      }),
    );
    if (!found.event) return { ok: false, error: "missing" };

    const clock = churchNow(found.timezone);
    const result = await registerForEvent({
      churchSlug: session.tenantSlug,
      eventSlug: found.event.slug,
      today: clock.date,
      now: clock.time,
      party: input.party,
      trial: true,
    });

    return result.ok
      ? { ok: true, going: result.going, waiting: result.waiting }
      : { ok: false, errors: result.errors };
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
}
