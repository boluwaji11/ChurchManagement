import { t, type MessageKey, type Params } from "@hearth/i18n";

/**
 * Errors that are outcomes, not faults.
 *
 * A duplicate name and a missing choice are things a person did, and the right
 * response is a sentence next to the field. Everything else is a bug, and a bug
 * dressed up as a validation message is a bug nobody ever finds. Only these
 * types are turned into user-facing text; anything else is rethrown.
 *
 * Each carries the catalogue key and its values rather than a finished sentence,
 * so the layer that knows the reader's language does the rendering. `message`
 * stays readable in English for logs and stack traces, which are read by us.
 */

export interface UserFacingError {
  readonly key: MessageKey;
  readonly params?: Params;
}

/** The input cannot be accepted, and the message says why in plain words. */
export class InvalidInputError extends Error implements UserFacingError {
  readonly key: MessageKey;
  readonly params: Params | undefined;
  constructor(key: MessageKey, params?: Params) {
    super(t(key, params));
    this.name = "InvalidInputError";
    this.key = key;
    this.params = params;
  }
}

/** A name would collide with something that already exists. */
export class NameTakenError extends Error implements UserFacingError {
  readonly key: MessageKey;
  readonly params: Params;
  readonly existingId: string;
  constructor(key: MessageKey, name: string, existingId: string) {
    super(t(key, { name }));
    this.name = "NameTakenError";
    this.key = key;
    this.params = { name };
    this.existingId = existingId;
  }
}
