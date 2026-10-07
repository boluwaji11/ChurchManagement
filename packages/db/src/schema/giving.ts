import {
  pgTable, uuid, text, integer, boolean, date, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { members } from "./members";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R13.x. What the church received, and what it was for.
 *
 * Money is held in whole cents as integers. A float cannot represent $0.10, and
 * a statement that is out by a cent is a statement a treasurer cannot sign.
 *
 * The platform never holds any of it. A card gift is a charge on the church's
 * own Stripe account with no application fee, so the money moves from the giver
 * to the church and Stripe's processing fee comes off the church's own balance.
 * What is written here is a record of what happened, never a claim on it.
 */

/** R13.9. What a gift can be given to. */
export const funds = pgTable(
  "funds",
  {
    id: pk(),
    tenantId: tenantId(),
    /** "General", "Building", "Benevolence". The church's own word. */
    name: text("name").notNull(),
    /** A short code for the accounting export. "GEN", "BLD". */
    code: text("code"),
    /**
     * R13.9. Whether the giver's intent binds the money.
     *
     * A restricted fund is reported apart from the rest, because money given
     * for a building cannot be spent on the electricity bill.
     */
    restricted: boolean("restricted").notNull().default(false),
    /** R13.6. What a giver reads beside the fund on the giving page. */
    description: text("description"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("fund_tenant_idx").on(t.tenantId),
    uniqueIndex("fund_name_unique").on(t.tenantId, t.name),
  ],
);

/**
 * R13.10, R13.11. A counting session: what the team took out of the plate.
 *
 * The batch is declared before it is entered. The counters say what they think
 * is there, then enter it line by line, and the batch closes only when the two
 * agree or somebody writes down why they do not.
 */
export const giftBatches = pgTable(
  "gift_batches",
  {
    id: pk(),
    tenantId: tenantId(),
    /** "Sunday morning, 12 October". What the treasurer calls this count. */
    name: text("name").notNull(),
    /** The day the money was received, which is the day it is given on. */
    receivedOn: date("received_on").notNull(),
    /** R13.10. What the counters declared before entering a single line. */
    expectedCents: integer("expected_cents").notNull().default(0),
    /** R13.11. Dual control: two people counted it. */
    counterOneId: uuid("counter_one_id").references(() => members.id, { onDelete: "set null" }),
    counterTwoId: uuid("counter_two_id").references(() => members.id, { onDelete: "set null" }),
    /** R13.11. Why the count and the declaration differ, where they do. */
    varianceNote: text("variance_note"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("gift_batch_tenant_idx").on(t.tenantId),
    index("gift_batch_date_idx").on(t.tenantId, t.receivedOn),
  ],
);

/**
 * R13.x. One gift.
 *
 * A gift with no member is anonymous (R13.14) and still counts to the fund. A
 * gift in kind (R13.13) carries a description and no cash value in the totals,
 * because the church states what was given and the giver values it.
 */
export const gifts = pgTable(
  "gifts",
  {
    id: pk(),
    tenantId: tenantId(),
    /** Null where the gift is anonymous, or where the giver has no record yet. */
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    /**
     * R13.6. What a giver with no record typed on the church's giving page.
     *
     * A statement has to be written for them in January whether or not anybody
     * has got round to putting them in the directory.
     */
    giverName: text("giver_name"),
    giverEmail: text("giver_email"),
    fundId: uuid("fund_id").notNull().references(() => funds.id, { onDelete: "restrict" }),
    /** Null for anything that did not come through a counting session. */
    batchId: uuid("batch_id").references(() => giftBatches.id, { onDelete: "set null" }),
    /** Whole cents. Zero only on a gift in kind. */
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    /** cash, cheque, card, ach, in_kind, other. */
    method: text("method").notNull().default("cash"),
    /** R13.12. The cheque number, where there is one. */
    reference: text("reference"),
    receivedOn: date("received_on").notNull(),
    note: text("note"),
    /** R13.13. What was given, where it was not money. */
    inKindDescription: text("in_kind_description"),

    /*
     * R13.1, R13.5. What Stripe did, for a gift that came in online.
     *
     * The fee is recorded because the church pays it and its treasurer has to
     * reconcile the deposit, not because the platform takes any part of it.
     */
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    feeCents: integer("fee_cents").notNull().default(0),
    /** R13.5. Whether the giver chose to add the processing fee to the gift. */
    coveredFee: boolean("covered_fee").notNull().default(false),

    /** R13.15. A refund is recorded against the gift rather than deleting it. */
    refundedCents: integer("refunded_cents").notNull().default(0),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),

    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("gift_tenant_idx").on(t.tenantId),
    index("gift_date_idx").on(t.tenantId, t.receivedOn),
    index("gift_member_idx").on(t.tenantId, t.memberId),
    index("gift_fund_idx").on(t.tenantId, t.fundId),
    index("gift_batch_idx").on(t.tenantId, t.batchId),
    /*
     * R13.4. One payment may write a row a fund, so the fund is part of what
     * makes a gift unique. A webhook delivered twice still writes once.
     */
    uniqueIndex("gift_intent_fund_unique").on(t.tenantId, t.stripePaymentIntentId, t.fundId),
  ],
);

/**
 * R13.1. The church's own Stripe account.
 *
 * One a church. The id is all we keep: the account belongs to the church, the
 * money settles to its bank, and the platform's application fee is zero on
 * every charge. Nothing here is a credential.
 */
export const stripeAccounts = pgTable(
  "stripe_accounts",
  {
    id: pk(),
    tenantId: tenantId(),
    /** The connected account, as Stripe knows it. */
    accountId: text("account_id").notNull(),
    /** Whether Stripe will take a payment on it yet. */
    chargesEnabled: boolean("charges_enabled").notNull().default(false),
    payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
    detailsSubmitted: boolean("details_submitted").notNull().default(false),
    /** False while the church is connected to a test account. */
    livemode: boolean("livemode").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("stripe_account_tenant_unique").on(t.tenantId),
    uniqueIndex("stripe_account_id_unique").on(t.accountId),
  ],
);

/**
 * R13.3. A gift that repeats.
 *
 * The subscription itself lives on the church's own Stripe account. This is
 * what the church reads, so a treasurer can see what is expected next month
 * without signing in to Stripe. Each payment still lands in `gifts` as its own
 * row, because that is what a statement is built from.
 */
export const recurringGifts = pgTable(
  "recurring_gifts",
  {
    id: pk(),
    tenantId: tenantId(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    giverName: text("giver_name"),
    giverEmail: text("giver_email"),
    fundId: uuid("fund_id").references(() => funds.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    /** month or week, as the giver chose. */
    interval: text("interval").notNull().default("month"),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    /** active, past_due, canceled. Stripe's own word for it. */
    status: text("status").notNull().default("active"),
    startedOn: date("started_on"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("recurring_gift_tenant_idx").on(t.tenantId),
    uniqueIndex("recurring_gift_subscription_unique").on(t.stripeSubscriptionId),
  ],
);

/**
 * R13.16. A target over a period, against one fund.
 *
 * "The roof, $80,000, by next Easter." The fund is what makes progress
 * countable without anybody reconciling by hand: every gift to that fund
 * inside the period counts once, and nothing is counted twice.
 */
export const campaigns = pgTable(
  "campaigns",
  {
    id: pk(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    description: text("description"),
    fundId: uuid("fund_id").notNull().references(() => funds.id, { onDelete: "restrict" }),
    targetCents: integer("target_cents").notNull().default(0),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("campaign_tenant_idx").on(t.tenantId),
    uniqueIndex("campaign_name_unique").on(t.tenantId, t.name),
  ],
);

/** R13.16. One household's commitment to a campaign. */
export const pledges = pgTable(
  "pledges",
  {
    id: pk(),
    tenantId: tenantId(),
    campaignId: uuid("campaign_id").notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    /**
     * Whoever made the commitment. Progress is counted across their household,
     * so a couple who pledged once is not asked for it twice.
     */
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull().default(0),
    note: text("note"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("pledge_tenant_idx").on(t.tenantId),
    uniqueIndex("pledge_once").on(t.campaignId, t.memberId),
  ],
);
