import "server-only";
import { t } from "@connectapp/i18n";
import { longDate } from "@/lib/dates";
import type { Message } from "@/lib/email-provider";

/**
 * HRT-370, R1.7, R16.4. The message that reaches the person an invitation
 * names.
 *
 * Four things it has to say: who invited them, which church, what they will be
 * able to do, and the day the invitation runs out. The link takes them to the
 * church's own door with the address already in the box, because joining is
 * matched on the verified address and somebody who signs up with the other one
 * of their two addresses arrives in no church at all.
 *
 * Signing in is offered beside it for the same reason. An invitation is taken
 * up on sign-up, on sign-in and on the confirmation that follows either, so
 * somebody who already has an account has nothing to create.
 */
export interface Invitation {
  church: string;
  /** The name on the account that sent it, where the account carries one. */
  invitedBy: string | null;
  /** The role, by the name this church reads it under. */
  role: string;
  address: string;
  expiresAt: Date;
  /** The church's own origin, which both links hang off. */
  origin: string;
}

/** Nothing reaches the markup as markup. */
const safe = (raw: string): string =>
  raw.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function inviteMessage(invitation: Invitation): Omit<Message, "from"> {
  const at = `?email=${encodeURIComponent(invitation.address)}`;
  const join = `${invitation.origin}/sign-up${at}`;
  const signIn = `${invitation.origin}/sign-in${at}`;
  const day = longDate(invitation.expiresAt.toISOString().slice(0, 10));

  const opening = invitation.invitedBy
    ? t("invite.mail.openingBy", {
        inviter: invitation.invitedBy,
        church: invitation.church,
        role: invitation.role,
      })
    : t("invite.mail.opening", { church: invitation.church, role: invitation.role });

  const subject = invitation.invitedBy
    ? t("invite.mail.subjectBy", { inviter: invitation.invitedBy, church: invitation.church })
    : t("invite.mail.subject", { church: invitation.church });

  return {
    to: invitation.address,
    subject,
    text: [
      opening,
      "",
      t("invite.mail.create", { address: invitation.address }),
      join,
      "",
      t("invite.mail.already", { address: invitation.address }),
      signIn,
      "",
      t("invite.mail.until", { day }),
    ].join("\n"),
    html: markup({ opening, join, signIn, day, address: invitation.address }),
  };
}

/**
 * R16.4. The same message marked up, in the one shape every mail program
 * draws.
 *
 * Inline styles and a table-free single column, because a mail program drops a
 * stylesheet and some of them drop a float. The button is a padded anchor, so
 * the one that draws no background still leaves a link somebody can press.
 */
function markup(input: {
  opening: string;
  join: string;
  signIn: string;
  day: string;
  address: string;
}): string {
  const frame =
    "font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#1c1917;" +
    "max-width:520px;margin:0 auto;padding:24px";

  return (
    `<div style="${frame}">` +
    `<p style="margin:0 0 20px">${safe(input.opening)}</p>` +
    `<p style="margin:0 0 20px">` +
    `<a href="${safe(input.join)}" style="display:inline-block;padding:12px 20px;` +
    `border-radius:10px;background:#1c1917;color:#fafaf9;text-decoration:none;` +
    `font-weight:600">${safe(t("invite.mail.button"))}</a></p>` +
    `<p style="margin:0 0 20px;font-size:14px;color:#57534e">` +
    `${safe(t("invite.mail.create", { address: input.address }))}<br>` +
    `<a href="${safe(input.join)}" style="color:#1c1917">${safe(input.join)}</a></p>` +
    `<p style="margin:0 0 20px;font-size:14px;color:#57534e">` +
    `${safe(t("invite.mail.already", { address: input.address }))}<br>` +
    `<a href="${safe(input.signIn)}" style="color:#1c1917">${safe(input.signIn)}</a></p>` +
    `<p style="margin:0;font-size:14px;color:#57534e">` +
    `${safe(t("invite.mail.until", { day: input.day }))}</p>` +
    `</div>`
  );
}
