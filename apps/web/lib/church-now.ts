import "server-only";

/**
 * The date and time where the church is.
 *
 * A service at 09:00 in Austin has not happened yet when the server in Virginia
 * says 09:30, and it has when a server in California says 07:00. Sunday is a
 * local idea (R1.1), so anything deciding whether a service has been held reads
 * the clock the church reads.
 */
export interface ChurchNow {
  /** yyyy-mm-dd, local to the church. */
  date: string;
  /** HH:MM, local to the church. */
  time: string;
}

export function churchNow(timezone: string): ChurchNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    // Midnight comes back as 24 from some runtimes.
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  };
}

/** True once the service has started, in the church's own time. */
export function hasHappened(now: ChurchNow, occursOn: string, startsAt: string): boolean {
  if (occursOn < now.date) return true;
  if (occursOn > now.date) return false;
  return startsAt <= now.time;
}
