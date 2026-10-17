import { t } from "@connectapp/i18n";

/**
 * HRT-388, R16.4, R24.x. The one shape every message this platform sends is
 * drawn in.
 *
 * A church meets ConnectApp through its inbox before it meets the product: an
 * invitation, a welcome, the word that it has been approved. Three messages
 * drawn three ways read as three products, so the brand, the card and the
 * footer are written once here and the messages above only say what they have
 * to say.
 *
 * Tables, inline styles and a single column at 560px, because a mail program
 * drops a stylesheet, some drop a float, and Outlook lays the whole thing out
 * on a word processor. The card sits on a tinted canvas so it reads as a piece
 * of paper on a phone as well as in a desktop window.
 */

/*
 * The brand, in the few values a mail program can be relied on to draw.
 *
 * Taken from packages/ui/tokens/color.json and written here as hex, because
 * oklch reaches no mail client worth naming and a colour it cannot parse is a
 * colour it drops.
 */
export const INK = "#514a95";
export const INK_MID = "#6b64b6";
export const INK_SOFT = "#afaee5";
export const PAPER = "#ffffff";
export const CANVAS = "#f3f3fc";
export const LINE = "#e0ddda";
export const TEXT = "#231f19";
export const MUTED = "#6d6861";

/** Nothing reaches the markup as markup. */
export const safe = (raw: string): string =>
  raw.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/*
 * Where our own name goes. Not PLATFORM_HOST, which is localhost on a laptop
 * and would put a link nobody can open into a message that leaves the
 * building.
 */
export const HOME = process.env["PLATFORM_SITE"] ?? "https://connectapp.church";

/**
 * Where a reply goes, for a message that invites one.
 *
 * Mail from the platform goes out as `PLATFORM_FROM_EMAIL`, which is a
 * sending address rather than a mailbox anybody reads. A message that says
 * "reply to this email" has to put a read mailbox in the reply-to, or the
 * one church that takes us up on it writes into nothing.
 */
export const SUPPORT = process.env["SUPPORT_FROM_EMAIL"] ?? "support@connectapp.church";

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
export function mark(): string {
  const bar = (height: number, colour: string) =>
    `<td style="width:5px;padding:0 2px;vertical-align:bottom">`
    + `<div style="width:5px;height:${height}px;border-radius:3px;background:${colour};`
    + `font-size:0;line-height:0">&nbsp;</div></td>`;

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + bar(11, INK_SOFT)
    + bar(16, INK_MID)
    + bar(21, INK)
    + `</tr></table>`
  );
}

/** A paragraph of the message's own body. */
export const line = (words: string): string =>
  `<p style="margin:18px 0 0;font-size:16px;line-height:1.6">${safe(words)}</p>`;

/** The same, quieter: an aside rather than something being said. */
export const aside = (words: string): string =>
  `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">${safe(words)}</p>`;

/**
 * A sentence with one phrase in it picked out.
 *
 * The catalogue holds the whole sentence, so the emphasis goes in after the
 * escaping rather than through it, which is what the marker is for.
 */
export function pickOut(sentence: string, marker: string, inside: string): string {
  return safe(sentence).replace(
    marker,
    `<strong style="font-weight:600">${safe(inside)}</strong>`,
  );
}

/**
 * A sentence with one phrase in it that is a link.
 *
 * The catalogue holds the whole sentence, so the markup goes in after the
 * escaping rather than through it, which is what the marker is for.
 */
export function linkInto(
  sentence: string,
  marker: string,
  href: string,
  label: string,
): string {
  return safe(sentence).replace(
    marker,
    `<a href="${safe(href)}" style="color:${INK};font-weight:600">${safe(label)}</a>`,
  );
}

/** A quiet paragraph whose contents are already marked up. */
export const asideHtml = (inner: string): string =>
  `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">${inner}</p>`;

/** A body paragraph whose contents are already marked up. */
export const lineHtml = (inner: string): string =>
  `<p style="margin:18px 0 0;font-size:16px;line-height:1.6">${inner}</p>`;

/** The one thing to press. A message has one or it has none. */
export const button = (label: string, href: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"`
  + ` style="margin:26px 0 0"><tr><td style="border-radius:10px;background:${INK}">`
  + `<a href="${safe(href)}" style="display:inline-block;padding:14px 26px;`
  + `font-size:16px;font-weight:600;color:${PAPER};text-decoration:none">`
  + `${safe(label)}</a></td></tr></table>`;

/**
 * The card, with the brand above the message and the footer below it.
 *
 * `body` is whatever the message had to say, already marked up by the helpers
 * above. `foot` is the small print, which every message carries and no two
 * carry the same.
 */
export function shell(input: { headline: string; body: string; foot: string }): string {
  const base = `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${TEXT}`;
  const pad = "padding:0 32px";

  return (
    `<div style="background:${CANVAS};${base};margin:0;padding:32px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`
    + `<tr><td align="center">`

    + `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"`
    + ` style="width:100%;max-width:560px;background:${PAPER};border:1px solid ${LINE};`
    + `border-radius:14px">`

    // The brand, on its own line above everything the message is about.
    + `<tr><td style="padding:28px 32px 0">`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td style="padding-right:10px">${mark()}</td>`
    + `<td style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${TEXT}">`
    + `${safe(t("app.name"))}</td>`
    + `</tr></table></td></tr>`

    + `<tr><td style="${pad};padding-top:22px">`
    + `<h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;`
    + `letter-spacing:-0.02em;color:${TEXT}">${safe(input.headline)}</h1></td></tr>`

    + `<tr><td style="${pad}">${input.body}</td></tr>`

    + `<tr><td style="padding:26px 32px 0">`
    + `<div style="height:1px;background:${LINE};font-size:0;line-height:0">&nbsp;</div>`
    + `</td></tr>`

    + `<tr><td style="padding:18px 32px 28px">`
    + `<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED}">${input.foot}</p>`
    + `</td></tr>`

    + `</table></td></tr></table></div>`
  );
}

/** "Sent by ConnectApp", with our own name linked to our own front door. */
export function sentBy(sentence: string, marker: string): string {
  return safe(sentence).replace(
    marker,
    `<a href="${HOME}" style="color:${MUTED};font-weight:600">${safe(t("app.name"))}</a>`,
  );
}
