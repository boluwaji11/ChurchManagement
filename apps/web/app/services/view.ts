/**
 * Which shape the month is drawn in. Shared by the server page and the bar.
 *
 * The calendar is what the page opens on. It answers the question a church
 * arrives with, which is what is on and what is missing, and a day with nothing
 * in it is somewhere to press.
 */
export const VIEWS = ["list", "calendar", "tiles"] as const;

export type View = (typeof VIEWS)[number];

export const isView = (value: string | undefined): value is View =>
  VIEWS.includes(value as View);
