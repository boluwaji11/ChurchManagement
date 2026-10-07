import { sql } from "drizzle-orm";
import { gifts } from "../schema/giving";

/** R13.2. What has happened to a gift. */
export const GIFT_STATUSES = ["settled", "pending", "failed"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

/**
 * R13.2. The money that actually arrived.
 *
 * Every total, statement, fund balance, campaign and report is built on this.
 * A bank debit sits pending for a few days after the giver authorises it, and
 * it can be returned after that, so counting it early would put a number on a
 * treasurer's screen that the bank later disagrees with. It shows on the
 * giving list as pending, and it joins the totals when it settles.
 */
export const settled = sql`${gifts.status} = 'settled'`;
