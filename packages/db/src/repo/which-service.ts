/**
 * R8.2. Which of today's services the station opens on.
 *
 * Imported by the browser as well as the server, which is why it has no
 * imports of its own and sits behind its own entry point: pulling the database
 * package into a client bundle pulls node:crypto with it.
 *
 * A church with a 09:00 and an 11:00 has a desk standing in front of both all
 * morning, and the one that matters is whichever is happening. Opening on the
 * first of the day means that at 11:15 a volunteer is writing children into a
 * service that finished two hours ago, and nothing on the screen says so.
 *
 * The one that has started most recently wins, for as long as a service
 * plausibly runs. Before the first one starts, the next one. Outside both, the
 * nearest, because a station on a Tuesday evening should still work.
 */
const RUNS_FOR_MINUTES = 150;
const OPENS_BEFORE_MINUTES = 90;

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function serviceNow<T extends { id: string; startsAt: string }>(
  services: T[],
  now: string,
): string {
  if (services.length === 0) return "";

  const at = minutes(now);
  const sorted = [...services].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const running = sorted
    .filter((s) => {
      const start = minutes(s.startsAt);
      return at >= start && at - start <= RUNS_FOR_MINUTES;
    })
    .pop();
  if (running) return running.id;

  const soon = sorted.find((s) => {
    const start = minutes(s.startsAt);
    return start > at && start - at <= OPENS_BEFORE_MINUTES;
  });
  if (soon) return soon.id;

  return sorted
    .map((s) => ({ id: s.id, away: Math.abs(minutes(s.startsAt) - at) }))
    .sort((a, b) => a.away - b.away)[0]!.id;
}
