import type { Gift } from "@connectapp/db";

/**
 * R13.15. A refund is a line of its own.
 *
 * A gift happened and a refund happened, on different days, and a treasurer
 * reconciling a bank statement is looking for both. Netting them into one
 * figure hides the day the money went back, so the list carries the gift at
 * what was given and the refund under its own date as a negative line.
 *
 * It is worked out from the gift rather than stored: the refund already lives
 * on the gift it belongs to, and a gift refunded twice reads as one line for
 * what has gone back in total.
 */
export interface GiftRow {
  key: string;
  gift: Gift;
  /** Whether this line is the gift or the money going back. */
  kind: "gift" | "refund";
  on: string;
  /** Negative on a refund. */
  amountCents: number;
  status: string;
  /**
   * Whether this line is one of a pair. A refund and the gift it came off are
   * two lines about one payment, so the rule between them comes out and the
   * refund is marked as belonging to what is under it.
   */
  tied: boolean;
}

export function giftRows(gifts: Gift[]): GiftRow[] {
  const rows: GiftRow[] = [];

  for (const gift of gifts) {
    /* The refund happened after the gift, and the list runs newest first, so
       it leads its own gift where the two fall on the same day. */
    if (gift.refundedCents > 0) {
      rows.push({
        key: `${gift.id}:refund`,
        gift,
        kind: "refund",
        on: gift.refundedOn ?? gift.receivedOn,
        amountCents: -gift.refundedCents,
        status: "refunded",
        tied: true,
      });
    }

    rows.push({
      key: gift.id,
      gift,
      kind: "gift",
      on: gift.receivedOn,
      amountCents: gift.amountCents,
      status: gift.status,
      tied: gift.refundedCents > 0,
    });
  }

  return rows.sort((a, b) => (a.on === b.on ? 0 : a.on < b.on ? 1 : -1));
}
