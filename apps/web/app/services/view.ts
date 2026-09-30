/** Which shape the month is drawn in. Shared by the server page and the bar. */
export const VIEWS = ["list", "calendar", "tiles"] as const;

export type View = (typeof VIEWS)[number];

export const isView = (value: string | undefined): value is View =>
  VIEWS.includes(value as View);
