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
  opts: { view?: "inbox" | "sent" | "drafts"; key?: string | null; watching?: boolean } = {},
): { data: InboxData; refresh: () => void } {
  const { view = "inbox", key = null, watching = false } = opts;
  const [data, setData] = React.useState<InboxData>(EMPTY);
  const live = React.useRef(true);

  const read = React.useCallback(async () => {
    const where = `/api/inbox?church=${encodeURIComponent(church)}&view=${view}`
      + (key ? `&key=${encodeURIComponent(key)}` : "");
    try {
      const answer = await fetch(where, { cache: "no-store" });
      if (!answer.ok) return;
      const next = (await answer.json()) as InboxData;
      if (live.current) setData(next);
    } catch {
      // A dropped connection is the next poll's problem, not the reader's.
    }
  }, [church, view, key]);

  React.useEffect(() => {
    live.current = true;
    void read();

    const every = setInterval(() => { void read(); }, watching ? WATCHING : RESTING);
    const back = () => { if (document.visibilityState === "visible") void read(); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);

    return () => {
      live.current = false;
      clearInterval(every);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
    };
  }, [read, watching]);

  return { data, refresh: () => { void read(); } };
}
