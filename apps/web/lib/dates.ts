/**
 * How a date is written, in one place.
 *
 * Four formats were in use: ISO straight out of the database on a person's
 * record, long dates in the card below it, "en-US" hardcoded on three screens,
 * and the browser's locale everywhere else. A church reading 1983-04-21 on a
 * record and "21 April 1983" two inches below it is reading two products.
 *
 * The locale is the church's, from the country on its record, and never the
 * browser's. A church in Missouri whose treasurer has a British laptop was
 * reading 07/10/2026 for the seventh of October.
 */
import { readingLocale } from "./reading-locale";

/** "21 April 1983". For a record, where the year matters. */
export const longDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(readingLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** "Tuesday, 21 April". For something coming up, where the year is obvious. */
export const dayAndMonth = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(readingLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** "21 April". For a list, where the weekday is noise. */
export const shortDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(readingLocale(), { day: "numeric", month: "long" });

/** "7:30pm", from HH:MM. */
export const readableTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at
    .toLocaleTimeString(readingLocale(), { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};
