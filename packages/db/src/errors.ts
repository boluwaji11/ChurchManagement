/**
 * Errors that are outcomes, not faults.
 *
 * A duplicate name and a missing choice are things a person did, and the right
 * response is a sentence next to the field. Everything else is a bug, and a bug
 * dressed up as a validation message is a bug nobody ever finds. Only these two
 * types are turned into user-facing text; anything else is rethrown.
 */

/** The input cannot be accepted, and the message says why in plain words. */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

/** A name would collide with something that already exists. */
export class NameTakenError extends Error {
  readonly existingId: string;
  constructor(what: string, existingId: string) {
    super(`There is already ${what}.`);
    this.name = "NameTakenError";
    this.existingId = existingId;
  }
}
