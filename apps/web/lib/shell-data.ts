import "server-only";
import { cache } from "react";
import {
  withTenant, countUnread, listNotifications, getChurch, setupProgress,
  churchStanding, personForUser, photoKeyFor, canManageChurch, canEditPeople,
  demoChurchInfo, unreadFor,
  type Notification, type ChurchProfile, type SetupProgress, type ChurchStanding,
} from "@connectapp/db";
import { requireSession, type Session } from "@/lib/session";

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
/**
 * R24.11. How long the frame's answers stand before they are read again.
 *
 * Measured at about 500ms to build, and it was built again on every single
 * navigation, which made it the largest cost in the product: a navigation that
 * stays inside one layout costs 65ms, and one that rebuilds the frame costs
 * about 690ms. The frame is a layout now (HRT-360), so a navigation inside the
 * product does not rebuild it at all; this hold is what covers the first screen
 * of a visit, a reload, and a refresh after a write.
 *
 * Twenty seconds, because what it holds is a bell count, a notification list,
 * the church's mark, the setup path and whether the church is approved yet.
 * None of those is wrong at nineteen seconds old, and the bell already polls.
 */
const HOLD_FOR = 20 * 1000;
const HELD = new Map<string, { data: ShellData; until: number }>();

/**
 * What makes two requests the same reader for this purpose.
 *
 * The role and the permissions are in the key, not just the ids. A church that
 * changes somebody's role changes this string, so the next read misses and the
 * frame is rebuilt: a permission can never be served out of a hold. The setup
 * path and the bell both depend on what the reader may do, so they have to be
 * keyed on it anyway.
 */
const holdKey = (session: Session): string =>
  [
    session.userId,
    session.tenantId,
    session.role,
    [...(session.permissions ?? [])].sort().join(","),
  ].join("|");

/** Rebuilds the frame on the next read, for a reader whose own change needs it. */
export function forgetShell(session: Session): void {
  HELD.delete(holdKey(session));
}

export const shellData = cache(async (session: Session): Promise<ShellData> => {
  const key = holdKey(session);
  const now = Date.now();
  const held = HELD.get(key);

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  /*
   * R22.1, R24.11. A church still setting up reads its own progress every
   * time; everybody else reads the hold.
   *
   * The guide's whole promise is that it ticks itself off as the work is done,
   * and the work is done on the screens the guide sent them to. Holding the
   * answer for twenty seconds meant a church saved a room, watched the step
   * sit there, and saved it again. That is the one thing this cannot do.
   *
   * It costs one counting statement, measured at p50 46ms, and only while a
   * church is in its first week: once the guide is finished or put away there
   * is no progress to read and the hold serves everything, which is the state
   * every church is in for the rest of its life.
   */
  if (held && held.until > now) {
    const walking = held.data.setup && !held.data.setup.complete && !held.data.setup.dismissed;
    if (!walking) return held.data;

    const setup = await withTenant(ctx, (tx) => setupProgress(tx, session));
    const data = { ...held.data, setup };
    HELD.set(key, { data, until: held.until });
    return data;
  }

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
        canManageChurch(session) ? setupProgress(tx, session) : null,
        churchStanding(tx, session.tenantId),
        personForUser(tx, session.userId),
      ]);

      /*
       * Two more reads, which want the person's id and nothing from each
       * other, so they go together rather than one behind the other.
       *
       * R16.9 counts the waiting conversations here so the mark in the corner
       * is right the moment the page appears rather than a second afterwards.
       * The face used to be read through getPerson, which gathers a person's
       * custom fields and tags along with them, for the one column the frame
       * puts in the corner.
       */
      const [photoKey, waiting] = await Promise.all([
        self ? photoKeyFor(tx, self) : null,
        unreadFor(tx, {
          tenantId: session.tenantId,
          userId: session.userId,
          memberId: self,
          office: canEditPeople(session),
        }),
      ]);

      return {
        unread, waiting, notifications, church, setup, standing, photoKey,
      };
    }),
    demoChurchInfo(session.tenantId),
  ]);

  const data = { ...inTenant, demo };
  HELD.set(key, { data, until: Date.now() + HOLD_FOR });

  /* The map is per server instance and a church has one frame in it, so it
     cannot grow without bound in normal use. This is the guard against a very
     large instance holding every reader of every church at once. */
  if (HELD.size > 500) {
    for (const [k, v] of HELD) if (v.until <= now) HELD.delete(k);
  }

  return data;
});

/**
 * R24.11. The session for a screen that draws the frame around itself.
 *
 * Every staff screen awaits its own rows and then returns `<AppShell>`, which
 * is the first thing that asks for the frame's data. So the two ran one after
 * the other although neither needs the other: the frame wants the bell, the
 * church, the setup path and the reader's face, and the page wants its own
 * rows. The frame's trip, measured at about 130ms, was added to every screen
 * rather than overlapped with it.
 *
 * Starting it here puts it in flight before the screen reads anything, and
 * `shellData` is held for the request, so the `await` inside `AppShell` later
 * joins this one instead of opening a second.
 *
 * A screen uses this; a server action and an API route use `requireSession`,
 * because they draw no frame and reading one would be a transaction spent on
 * nothing. There are 181 callers of `requireSession` and 37 of them are
 * screens, so this is the smaller half and it is the half that is explicit.
 */
export async function requireScreen(asked?: string): Promise<Session> {
  const session = await requireSession(asked);

  /* Not awaited. The rejection is swallowed here and met again at the `await`
     in AppShell, which is where it belongs: an unhandled rejection now would
     take down a render that has not asked for this yet. */
  void shellData(session).catch(() => undefined);

  return session;
}
