"use server";

import { withTenant, fileIncident } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/*
 * This file has outlived the screen it was written for: the room board under
 * (bare)/checkin/rooms has no page any more, and the supervisor view lives at
 * (app)/checkin/floor.tsx. What is left is `report`, imported by
 * (app)/incidents/file-report.tsx. Moving it next to that screen is HRT-404's
 * neighbour on the board rather than part of a cleanup.
 */

export interface ReportResult {
  error?: string;
}

/**
 * R8.13. Filing an incident report.
 *
 * Open to whoever runs the station, because the person who saw it has to be
 * able to write it down. Reading them back is a different permission, and a
 * different screen.
 */
export async function report(
  input: {
    memberId: string;
    roomId: string | null;
    occurrenceId: string | null;
    occurredOn: string;
    volunteers: string;
    description: string;
    action: string;
    guardianNotified: boolean;
  },
  ): Promise<ReportResult> {
  const session = await requireSession();
  const actor = { tenantId: session.tenantId, role: session.role };
  const ctx = { ...actor, userId: session.userId };

  try {
    await withTenant(ctx, (tx) =>
      fileIncident(tx, actor, { ...input, userId: session.userId }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
