/**
 * R1.7. How long a password has to be, in one place.
 *
 * The form checks it before anybody presses anything and the server checks it
 * again, so it is written here rather than in the form: a constant exported
 * from a client component is a client component imported into a server action,
 * and the two counts drifting is a form that refuses what it just accepted.
 */
export const PASSWORD_LENGTH = 10;
