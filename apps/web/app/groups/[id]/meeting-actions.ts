"use server";

import {
  withTenant, openMeeting, recordMeeting, type Meeting, type MeetingPerson,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface MeetingResult {
  meeting?: Meeting;
  members?: MeetingPerson[];
  error?: string;
}

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
  };
}

/** R9.7. The meeting for a day, created the first time it is opened. */
export async function open(
  groupId: string,
  metOn: string,
  church?: string,
): Promise<MeetingResult> {
  const { actor, ctx } = await context(church);
  try {
    return await withTenant(ctx, (tx) => openMeeting(tx, actor, { groupId, metOn }));
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R9.7. One submit: who was there, and whether it happened at all. */
export async function record(
  input: { meetingId: string; presentIds: string[]; notHeld: boolean; note: string | null },
  church?: string,
): Promise<MeetingResult> {
  const { actor, ctx } = await context(church);
  try {
    return await withTenant(ctx, (tx) => recordMeeting(tx, actor, input));
  } catch (error) {
    return { error: explain(error) };
  }
}
