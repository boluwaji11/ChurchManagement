"use server";

import { withTenant, roomBoard, roomRoster, type Board, type RoomRosterEntry } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface BoardResult {
  board?: Board;
  rosters?: Record<string, RoomRosterEntry[]>;
  error?: string;
}

/**
 * R8.18, R8.19. The board as it is right now.
 *
 * Counted on every read rather than kept anywhere. A tally that drifts is worse
 * than no tally, because somebody will trust it in the one minute they should
 * be walking to the room instead.
 */
export async function board(occurrenceId: string, church?: string): Promise<BoardResult> {
  const session = await requireSession(church);
  const ctx = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  try {
    return await withTenant(ctx, async (tx) => {
      const live = await roomBoard(tx, occurrenceId);
      const rosters: Record<string, RoomRosterEntry[]> = {};
      for (const room of live.rooms) {
        rosters[room.roomId] = await roomRoster(tx, occurrenceId, room.roomId);
      }
      return { board: live, rosters };
    });
  } catch (error) {
    return { error: explain(error) };
  }
}
