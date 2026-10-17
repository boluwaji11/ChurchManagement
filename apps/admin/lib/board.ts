import "server-only";

/**
 * HRT-395. Where the board stands, read from the board.
 *
 * BACKLOG.md is the record of what is being built and it is kept in the same
 * commit as the work, so it is already the honest answer. Parsing it beats
 * keeping a second copy in a table that would drift from it inside a week.
 *
 * Fetched from the repository rather than read off disk: this app is deployed
 * with `apps/admin` as its root, so nothing above that directory is in the
 * bundle, and reading the file from `main` is the more useful answer anyway.
 */

const REPO = process.env["GITHUB_REPO"] ?? "boluwaji11/ConnectApp";
const HOLD_MS = 5 * 60 * 1000;

/**
 * The six states BACKLOG.md defines, and the bucket for everything else.
 *
 * Twenty-one rows carry a word the board's own table does not define: Dropped,
 * Cut, Folded, Moved, Held and Wiring. Guessing which of the six each one
 * means would put a number on a screen that nobody had checked, so they are
 * counted as Other and listed with the word they actually carry. A board that
 * has drifted is worth seeing rather than rounding off.
 */
export type State = "New" | "Active" | "Resolved" | "Closed" | "Blocked" | "Deferred" | "Other";

export const DEFINED: State[] = ["Active", "Resolved", "New", "Blocked", "Deferred", "Closed"];
export const STATES: State[] = [...DEFINED, "Other"];

export interface Story {
  id: string;
  /** The number, for sorting, since HRT-9 sorts after HRT-80 as text. */
  number: number;
  title: string;
  requirements: string;
  state: State;
  /** The word the row actually carries, which for Other is the whole point. */
  word: string;
  /** Anything written after the state, which is usually what it waits on. */
  note: string | null;
  /** The release heading this row sits under. */
  release: string;
}

export interface Board {
  stories: Story[];
  counts: Record<State, number>;
  /** Releases in the order the file puts them, which is the order they ship. */
  releases: { name: string; counts: Record<State, number>; total: number }[];
  /** When the file was last changed, which says whether this is being kept up. */
  at: Date | null;
}

const empty = (): Record<State, number> =>
  ({ New: 0, Active: 0, Resolved: 0, Closed: 0, Blocked: 0, Deferred: 0, Other: 0 });

let held: { at: number; value: Board | null } | null = null;

async function text(path: string): Promise<string | null> {
  const token = process.env["GITHUB_TOKEN"];
  try {
    const answer = await fetch(
      `https://raw.githubusercontent.com/${REPO}/main/${path}`,
      {
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return answer.ok ? await answer.text() : null;
  } catch {
    return null;
  }
}

/**
 * One row of the board.
 *
 * The state cell is not always one word: a closed story often carries what is
 * still owed in the same cell, as in "Closed. The check-in desk needs a
 * service on today's date to exercise". The first word is the state and the
 * rest is worth keeping, because it is the part somebody reading the board
 * actually needs.
 */
const ROW = /^\|\s*(HRT-(\d+))\s*\|([^|]*)\|([^|]*)\|\s*([A-Za-z]+)\.?\s*([^|]*)\|/;

export async function board(): Promise<Board | null> {
  const now = Date.now();
  if (held && now - held.at < HOLD_MS) return held.value;

  const file = await text("BACKLOG.md");
  if (!file) {
    held = { at: now, value: null };
    return null;
  }

  const stories: Story[] = [];
  let release = "Unplaced";

  for (const line of file.split("\n")) {
    const heading = /^##\s+(E\d+\.\s*.+)$/.exec(line.trim());
    if (heading?.[1]) {
      release = heading[1].trim();
      continue;
    }

    const row = ROW.exec(line);
    if (!row) continue;

    const word = (row[5] ?? "").trim();
    const state = DEFINED.find((one) => one.toLowerCase() === word.toLowerCase()) ?? "Other";

    const note = (row[6] ?? "").trim();
    stories.push({
      id: row[1]!,
      number: Number(row[2]),
      title: (row[3] ?? "").trim(),
      requirements: (row[4] ?? "").trim(),
      state,
      word,
      note: note || null,
      release,
    });
  }

  const counts = empty();
  const byRelease = new Map<string, Record<State, number>>();
  for (const story of stories) {
    counts[story.state] += 1;
    const into = byRelease.get(story.release) ?? empty();
    into[story.state] += 1;
    byRelease.set(story.release, into);
  }

  const value: Board = {
    stories,
    counts,
    releases: [...byRelease.entries()].map(([name, c]) => ({
      name,
      counts: c,
      total: Object.values(c).reduce((a, b) => a + b, 0),
    })),
    at: await lastChanged(),
  };

  held = { at: now, value };
  return value;
}

/** When BACKLOG.md was last committed, which says whether it is being kept. */
async function lastChanged(): Promise<Date | null> {
  const token = process.env["GITHUB_TOKEN"];
  try {
    const answer = await fetch(
      `https://api.github.com/repos/${REPO}/commits?path=BACKLOG.md&per_page=1`,
      {
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!answer.ok) return null;
    const rows = (await answer.json()) as { commit: { author: { date: string } } }[];
    const when = rows[0]?.commit.author.date;
    return when ? new Date(when) : null;
  } catch {
    return null;
  }
}

/**
 * HRT-395. How much of a release is finished.
 *
 * Closed only. Resolved means built and waiting to be tested by a person,
 * which is not the same as done and is the whole reason the two states are
 * separate.
 */
export const doneness = (counts: Record<State, number>, total: number): number =>
  total === 0 ? 0 : Math.round((counts.Closed / total) * 100);
