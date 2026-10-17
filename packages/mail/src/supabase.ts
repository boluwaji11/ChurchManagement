import { t } from "@connectapp/i18n";
import { button, line, safe, sentBy, shell } from "./brand";

/**
 * HRT-391, R1.7, R16.4. The three messages Supabase Auth sends, in our brand.
 *
 * Confirming an address, resetting a password and signing in by link are sent
 * by Supabase rather than by this product, because Supabase owns the token in
 * the link. What it does not own is how the message looks, and its default is
 * a line of unstyled text that arrives between an invitation and a welcome
 * drawn like a product.
 *
 * So the markup is written here, out of the same shell as the rest, and
 * pasted into the project's email templates. The one thing that is not ours
 * is the address: `{{ .ConfirmationURL }}` is Supabase's own placeholder and
 * has to reach the template untouched, which is why it is not escaped.
 */

/** Supabase's placeholder for the link it mints. It must survive verbatim. */
const LINK = "{{ .ConfirmationURL }}";

function message(input: {
  headline: string;
  /** What the message says, a paragraph at a time. */
  says: string[];
  press: string;
  ignore: string;
}): string {
  const APP = "\u0000app\u0000";
  return shell({
    headline: input.headline,
    body: input.says.map(line).join("") + button(input.press, LINK),
    foot: sentBy(t("mail.sentBy", { app: APP }), APP) + `<br>${safe(input.ignore)}`,
  });
}

/** "Confirm signup", which is the first thing anybody gets from us. */
export const verifyMarkup = (): string =>
  message({
    headline: t("mail.verify.headline"),
    says: [t("mail.verify.thanks"), t("mail.verify.opening")],
    press: t("mail.verify.button"),
    ignore: t("mail.verify.ignore"),
  });

/** "Reset password". */
export const resetMarkup = (): string =>
  message({
    headline: t("mail.reset.headline"),
    says: [t("mail.reset.opening")],
    press: t("mail.reset.button"),
    ignore: t("mail.reset.ignore"),
  });

/** "Magic link". */
export const magicMarkup = (): string =>
  message({
    headline: t("mail.magic.headline"),
    says: [t("mail.magic.opening")],
    press: t("mail.magic.button"),
    ignore: t("mail.magic.ignore"),
  });
