import { t } from "@connectapp/i18n";

/**
 * R17.x. Dates and times as a member reads them.
 *
 * Shared by the three portal screens so the same service never reads one way
 * on the home screen and another on the schedule.
 */

/** The day of the week a group meets on, from its number. */
export const dayName = (day: number): string =>
  new Date(2024, 0, 7 + day).toLocaleDateString("en-US", { weekday: "long" });

/** A stored 24-hour time, said the way it is spoken. */
export const readableTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

/** A date, short enough to sit beside something else on a phone. */
export const onDay = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short",
  });

/** The same, spelled out, for the one line that is read on its own. */
export const onDayLong = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long",
  });

/** A time with the word in front of it, so a line reads as a sentence. */
export const atTime = (hhmm: string): string =>
  t("home.atTime", { time: readableTime(hhmm) });
