import "server-only";
import { t } from "@connectapp/i18n";
import { longDate } from "@/lib/dates";
import type { Message } from "@/lib/email-provider";

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

/** Nothing reaches the markup as markup. */
const safe = (raw: string): string =>
  raw.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/*
 * The brand, in the few values a mail program can be relied on to draw.
 *
 * Taken from packages/ui/tokens/color.json and written here as hex, because
 * oklch reaches no mail client worth naming and a colour it cannot parse is a
 * colour it drops.
 */
const INK = "#514a95";
const INK_MID = "#6b64b6";
const INK_SOFT = "#afaee5";
const PAPER = "#ffffff";
const CANVAS = "#f3f3fc";
const LINE = "#e0ddda";
const TEXT = "#231f19";
const MUTED = "#6d6861";

/*
 * Where our own name goes. Not PLATFORM_HOST, which is localhost on a laptop
 * and would put a link nobody can open into a message that leaves the
 * building.
 */
const HOME = process.env["PLATFORM_SITE"] ?? "https://connectapp.church";

/**
 * The mark, drawn rather than linked.
 *
 * Three rising embers, the same shape as the one in the product, built out of
 * table cells with a background colour. An image would be the obvious way and
 * it is the wrong one: every mail program of consequence blocks remote images
 * until somebody asks for them, so the brand would be missing from the one
 * moment it is doing work. A rounded cell is drawn by everything, and the one
 * engine that ignores the radius draws three squares, which is still the mark.
 */
function mark(): string {
  const bar = (height: number, colour: string) =>
    `<td style="width:5px;padding:0 2px;vertical-align:bottom">` +
    `<div style="width:5px;height:${height}px;border-radius:3px;background:${colour};` +
    `font-size:0;line-height:0">&nbsp;</div></td>`;

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    bar(11, INK_SOFT) +
    bar(16, INK_MID) +
    bar(21, INK) +
    `</tr></table>`
  );
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
    html: markup({ ...invitation, opening, join, signIn, day }),
  };
}

/**
 * R16.4, R24.x. The same message marked up, in the one shape every mail
 * program draws.
 *
 * Tables, inline styles and a single column at 560px, because a mail program
 * drops a stylesheet, some drop a float, and Outlook lays the whole thing out
 * on a word processor. The card sits on a tinted canvas so it reads as a piece
 * of paper on a phone as well as in a desktop window.
 */
function markup(input: {
  church: string;
  opening: string;
  join: string;
  signIn: string;
  day: string;
}): string {
  const base = `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${TEXT}`;
  const pad = "padding:0 32px";

  /*
   * One sentence with one phrase in it that is a link. The catalogue holds the
   * whole sentence, so the markup goes in after the escaping rather than
   * through it, which is what the marker is for.
   */
  const MARKER = "\u0000signin\u0000";
  const already = safe(t("invite.mail.already", { signIn: MARKER })).replace(
    MARKER,
    `<a href="${safe(input.signIn)}" style="color:${INK};font-weight:600">` +
      `${safe(t("invite.mail.signIn"))}</a>`,
  );

  /* The same again in the footer: our own name, linked to our own front door. */
  const APP = "\u0000app\u0000";
  const sentBy = safe(
    t("invite.mail.sentBy", { app: APP, church: input.church }),
  ).replace(
    APP,
    `<a href="${HOME}" style="color:${MUTED};font-weight:600">${safe(t("app.name"))}</a>`,
  );

  const row = (contents: string) => `<tr><td style="${pad}">${contents}</td></tr>`;

  return (
    `<div style="background:${CANVAS};${base};margin:0;padding:32px 12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
    `<tr><td align="center">` +

    `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"` +
    ` style="width:100%;max-width:560px;background:${PAPER};border:1px solid ${LINE};` +
    `border-radius:14px">` +

    // The brand, on its own line above everything the message is about.
    `<tr><td style="padding:28px 32px 0">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td style="padding-right:10px">${mark()}</td>` +
    `<td style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${TEXT}">` +
    `${safe(t("app.name"))}</td>` +
    `</tr></table></td></tr>` +

    `<tr><td style="${pad};padding-top:22px">` +
    `<h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;` +
    `letter-spacing:-0.02em;color:${TEXT}">` +
    `${safe(t("invite.mail.headline", { church: input.church }))}</h1></td></tr>` +

    row(
      `<p style="margin:18px 0 0;font-size:16px;line-height:1.6">` +
        `${safe(input.opening)}</p>`,
    ) +
    row(
      `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">` +
        `${safe(t("invite.mail.what"))}</p>`,
    ) +

    // The one thing to press.
    row(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0"` +
        ` style="margin:26px 0 0"><tr><td style="border-radius:10px;background:${INK}">` +
        `<a href="${safe(input.join)}" style="display:inline-block;padding:14px 26px;` +
        `font-size:16px;font-weight:600;color:${PAPER};text-decoration:none">` +
        `${safe(t("invite.mail.button"))}</a></td></tr></table>`,
    ) +

    row(
      `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:${MUTED}">` +
        `${already}</p>`,
    ) +
    row(
      `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${MUTED}">` +
        `${safe(t("invite.mail.until", { day: input.day }))}</p>`,
    ) +

    `<tr><td style="padding:26px 32px 0">` +
    `<div style="height:1px;background:${LINE};font-size:0;line-height:0">&nbsp;</div>` +
    `</td></tr>` +

    `<tr><td style="padding:18px 32px 28px">` +
    `<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED}">` +
    `${sentBy}<br>` +
    `${safe(t("invite.mail.ignore"))}</p></td></tr>` +

    `</table></td></tr></table></div>`
  );
}
