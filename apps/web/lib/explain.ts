import { t } from "@hearth/i18n";
import { PermissionError, NameTakenError, InvalidInputError } from "@hearth/db";

/**
 * Turns an error from the data layer into a sentence for this reader.
 *
 * A refused permission and a duplicate name are expected outcomes, not faults,
 * so they come back as text the form can show. Anything else is a real fault and
 * is rethrown, because swallowing it would hide a bug behind a message that
 * reads like a rule.
 *
 * The data layer hands over a key and its values rather than a finished
 * sentence. It knows what went wrong. It does not know who is reading.
 */
export function explain(error: unknown): string {
  if (error instanceof PermissionError) {
    return t("error.permission", {
      role: t(`role.${error.role}`),
      action: t(`error.permission.${error.action}`),
    });
  }
  if (error instanceof NameTakenError) return t(error.key, error.params);
  if (error instanceof InvalidInputError) return t(error.key, error.params);
  throw error;
}
