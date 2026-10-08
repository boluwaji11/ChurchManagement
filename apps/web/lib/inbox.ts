import { personForUser, canEditPeople, type Reader } from "@connectapp/db";
import type { Tx } from "@connectapp/db";
import type { Session } from "@/lib/session";

/**
 * R16.9. Whoever is reading their messages.
 *
 * Staff read as the church, which is a role rather than a person: whoever is
 * on this month answers, and the thread belongs to the church. Everybody else
 * reads as themselves.
 */
export async function readerFor(tx: Tx, session: Session): Promise<Reader> {
  return {
    tenantId: session.tenantId,
    userId: session.userId,
    memberId: await personForUser(tx, session.userId),
    office: canEditPeople(session),
  };
}

/** The church's own context for a conversation, so the office has a name. */
export interface InboxChurch {
  name: string;
  locale: string;
}
