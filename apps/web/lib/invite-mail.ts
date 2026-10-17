import "server-only";
import { t } from "@connectapp/i18n";
import { longDate } from "@/lib/dates";
import type { Message } from "@/lib/email-provider";
import {
  shell, line, aside, button, linkInto, sentBy, safe,
} from "@connectapp/mail";

/**
 * HRT-370, HRT-373, R1.7, R16.4. The message that reaches the person an
 * invitation names.
 *
 * Four things it has to say: who invited them, which church, what they will be
 * able to do, and the day the invitation runs out. ConnectApp is the brand on
 * the envelope, because this is the platform's own mail and the address it
 * comes from is ours; the church is what the message is about, so it carries
 * the headline.
 *
 * One button. It goes to the church's own door with the address already in the
 * box, because joining is matched on the verified address and somebody who
 * signs up with the other of their two addresses arrives in no church at all.
 * Signing in is offered as a worded link beside it, for an account that exists:
 * an invitation is taken up on sign-up, on sign-in and on the confirmation
 * that follows either.
 *
 * The address in the link grants nothing. The invitation is matched to a
 * Supabase-verified address on the way in, so the link is a convenience and
 * the record is the control.
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

  /* The one phrase in each sentence that is not plain text: a link to sign in,
     and our own name in the footer. */
  const SIGN_IN = "\u0000signin\u0000";
  const APP = "\u0000app\u0000";

  return {
    to: invitation.address,
    subject,
    /*
     * The plain text carries the addresses, because a reader with no markup
     * has nothing to press. The markup does not: a button and a worded link
     * are what somebody reads, and a wall of query strings under them is the
     * thing that makes an invitation look machine-written.
     */
    text: [
      t("invite.mail.headline", { church: invitation.church }),
      "",
      opening,
      "",
      t("invite.mail.what"),
      "",
      `${t("invite.mail.button")}: ${join}`,
      "",
      `${t("invite.mail.already", { signIn: t("invite.mail.signIn") })} ${signIn}`,
      "",
      t("invite.mail.until", { day }),
      "",
      t("invite.mail.sentBy", { app: t("app.name"), church: invitation.church }),
      t("invite.mail.ignore"),
    ].join("\n"),
    html: shell({
      headline: t("invite.mail.headline", { church: invitation.church }),
      body:
        line(opening)
        + aside(t("invite.mail.what"))
        + button(t("invite.mail.button"), join)
        /* Its own style rather than the shared aside: this line sat at 14px
           with more air above it before the brand was shared, and a refactor
           is not the place to redraw a message that was signed off. */
        + `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#6d6861">`
        + `${linkInto(
          t("invite.mail.already", { signIn: SIGN_IN }),
          SIGN_IN,
          signIn,
          t("invite.mail.signIn"),
        )}</p>`
        + `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#6d6861">`
        + `${safe(t("invite.mail.until", { day }))}</p>`,
      foot:
        sentBy(t("invite.mail.sentBy", { app: APP, church: invitation.church }), APP)
        + `<br>${safe(t("invite.mail.ignore"))}`,
    }),
  };
}
