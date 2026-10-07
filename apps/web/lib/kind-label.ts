/**
 * R11.2. The kinds of plan item, as a screen shows them.
 *
 * Resolved on the server by `lib/kinds.ts`, which reads the church's list and
 * the product's own words for the eight. This half holds no import from the
 * data layer, because the plan screen is drawn in the browser and the data
 * layer belongs on the server.
 */
export interface KindOption {
  slug: string;
  label: string;
  archived: boolean;
}

/** What to call a slug an item is already filed under. */
export function kindLabel(slug: string, options: KindOption[]): string {
  return options.find((one) => one.slug === slug)?.label ?? slug;
}
