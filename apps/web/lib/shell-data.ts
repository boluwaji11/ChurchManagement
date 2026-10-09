import "server-only";
import { cache } from "react";
import {
  withTenant, countUnread, listNotifications, getChurch, setupProgress,
  churchStanding, personForUser, getPerson, canManageChurch, canEditPeople,
  demoChurchInfo, unreadFor,
  type Notification, type ChurchProfile, type SetupProgress, type ChurchStanding,
} from "@connectapp/db";
import type { Session } from "@/lib/session";

export interface ShellData {
  unread: number;
  /** R16.9. How many conversations are waiting, for the mark in the corner. */
  waiting: number;
  notifications: Notification[];
  church: ChurchProfile | null;
  setup: SetupProgress | null;
  standing: ChurchStanding;
  /** The signed-in person's photo, as a storage key for the shell to sign. */
  photoKey: string | null;
  demo: Awaited<ReturnType<typeof demoChurchInfo>>;
}

/**
 * Everything the frame around a screen needs, in one trip to the database.
 *
 * The shell used to open three transactions: one for the bell and the church,
 * one for the reader's own face, one for the banner that says a church is still
 * being checked. Each one is a BEGIN, a context to set, the query, and a COMMIT,
 * and the database is a continent away, so three of them spent most of half a
 * second on protocol. They all run as the same reader in the same church, so
 * they are one transaction, and the queries inside it go down the wire together
 * rather than one waiting on the last.
 *
 * Cached for the request, because the page inside the frame asks for some of the
 * same answers. The key is the session object, of which a request has one.
 */
export const shellData = cache(async (session: Session): Promise<ShellData> => {
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  /*
   * The demo check is cross-tenant by nature and runs on its own connection, so
   * it goes alongside the transaction rather than inside it.
   */
  const [inTenant, demo] = await Promise.all([
    withTenant(ctx, async (tx) => {
      const [unread, notifications, church, setup, standing, self] = await Promise.all([
        countUnread(tx, session.userId),
        listNotifications(tx, session.userId),
        // R1.1. The church's own mark, for the sidebar and the phone's top bar.
        getChurch(tx, session.tenantId),
        /*
         * R22.1. The setup path, where there is still one to walk. Only for
         * somebody who runs the church, because nobody else can do any of it,
         * and read here so the guide can follow them onto any screen.
         */
        canManageChurch(session) ? setupProgress(tx, session.tenantId) : null,
        churchStanding(tx, session.tenantId),
        personForUser(tx, session.userId),
      ]);

      const me = self
        ? await getPerson(tx, self, { role: session.role, userId: session.userId })
        : null;

      /* R16.9. Counted here so the mark in the corner is right the moment the
         page appears rather than a second afterwards. */
      const waiting = await unreadFor(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        memberId: self,
        office: canEditPeople(session),
      });

      return {
        unread, waiting, notifications, church, setup, standing,
        photoKey: me?.photoKey ?? null,
      };
    }),
    demoChurchInfo(session.tenantId),
  ]);

  return { ...inTenant, demo };
});
