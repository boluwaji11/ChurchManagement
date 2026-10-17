/**
 * R1.1. How many members a church can hold before a human has looked at it.
 *
 * Its own module because it is a number with no database behind it, and the
 * messages a church is sent quote it: a welcome that says one figure while the
 * screen enforces another is worse than one that says nothing. `rules` is the
 * entry anything outside the data layer reads, and it carries no drizzle.
 */
export const PROVISIONAL_PEOPLE = 25;
