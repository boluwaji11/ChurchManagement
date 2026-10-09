"use client";

import * as React from "react";

/**
 * R16.9. What the inbox looks like right now, kept current.
 *
 * Asked for again every few seconds while somebody is looking at it, and on
 * every return to the window, so a reply lands on the other side without
 * anybody reloading. Realtime is not in this version and a church of 50 to
 * 500 does not need it to feel immediate.
 */
export interface ThreadRow {
  key: string;
  name: string;
  photoUrl: string | null;
  memberId: string | null;
  lastLine: string;
  lastMine: boolean;
  at: string;
  unread: number;
}

export interface DraftRow {
  key: string;
  name: string;
  photoUrl: string | null;
  body: string;
  at: string;
}

export interface Said {
  id: string;
  body: string;
  fromOffice: boolean;
  name: string;
  photoUrl: string | null;
  mine: boolean;
  clock: string;
  day: string;
  at: string;
}

export interface InboxData {
  unread: number;
  threads: ThreadRow[];
  drafts: DraftRow[];
  open: {
    key: string;
    name: string;
    photoUrl: string | null;
    memberId: string | null;
    archived: boolean;
  } | null;
  said: Said[];
}

export const EMPTY: InboxData = { unread: 0, threads: [], drafts: [], open: null, said: [] };

/** How often it asks again: quickly while it is open, slowly while it is not. */
const WATCHING = 4000;
const RESTING = 25000;

export function useInbox(
  church: string,
  opts: {
    view?: "inbox" | "sent" | "drafts";
    key?: string | null;
    watching?: boolean;
    /** Whether the conversation named by `key` is on screen and being read. */
    reading?: boolean;
    /** What the server already put into the page, so nothing paints empty. */
    initial?: InboxData;
  } = {},
): { data: InboxData; refresh: () => void } {
  const { view = "inbox", key = null, watching = false, reading = false, initial } = opts;
  const [data, setData] = React.useState<InboxData>(initial ?? EMPTY);

  /*
   * R16.9. Only the newest answer is listened to.
   *
   * Opening a conversation asks for it while the answer to the last question
   * is still on its way back. That older answer knows nothing about the
   * conversation now open, so letting it land emptied the panel for a second
   * and then filled it again. Each request takes a number and an answer that
   * is no longer the newest is dropped.
   */
  const ticket = React.useRef(0);

  const read = React.useCallback(async () => {
    const mine = ++ticket.current;
    const where = `/api/inbox?church=${encodeURIComponent(church)}&view=${view}`
      + (key ? `&key=${encodeURIComponent(key)}` : "")
      + (key && reading ? "&reading=1" : "");
    try {
      const answer = await fetch(where, { cache: "no-store" });
      if (!answer.ok || mine !== ticket.current) return;
      const next = (await answer.json()) as InboxData;
      if (mine === ticket.current) setData(next);
    } catch {
      // A dropped connection is the next poll's problem, not the reader's.
    }
  }, [church, view, key, reading]);

  /* What is on screen belongs to the conversation that was asked for. While a
     different one is on its way, the old lines are held rather than cleared:
     a panel that empties and fills reads as broken. */
  const shown = React.useMemo(
    () => (key && data.open && data.open.key !== key ? { ...data, said: data.said } : data),
    [data, key],
  );

  React.useEffect(() => {
    void read();

    const every = setInterval(() => { void read(); }, watching ? WATCHING : RESTING);
    const back = () => { if (document.visibilityState === "visible") void read(); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);

    return () => {
      clearInterval(every);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
    };
  }, [read, watching]);

  return { data: shown, refresh: () => { void read(); } };
}
