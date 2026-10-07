# Giving

How money moves, and why ConnectApp never touches it.

## The rule

A gift goes from the giver to the church. ConnectApp is not in the path. There is no platform
balance, no payout from us to anybody, and no application fee on any charge. That is what keeps this
product free to run and keeps us out of money transmission.

## How that is arranged with Stripe

Each church connects its **own Stripe account** through Stripe Connect, as a **Standard** account.
Standard means the church is Stripe's customer: it agrees Stripe's terms, it passes Stripe's
verification under its own legal name and EIN, it owns the dashboard, and it can sign in to Stripe
without us. We introduced the account and can read its state. That is all.

Every charge is a **direct charge on the connected account**: the API call carries the church's
account id in the `Stripe-Account` header, so Stripe treats the church as the merchant of record.

```
  giver's card
      |
      v
  Stripe  --(fee, e.g. 2.2% + 30c at the church's nonprofit rate)--> Stripe
      |
      v
  the church's Stripe balance  -->  the church's bank account
```

ConnectApp appears nowhere in that diagram. `application_fee_amount` is never set, and
`PLATFORM_FEE` in `apps/web/lib/stripe.ts` is the constant that says so.

## Who pays the processing fee

The church does, out of its own Stripe balance, at whatever rate Stripe gives it. Stripe discounts
for registered nonprofits in the US, which a church applies for directly with Stripe. We neither
mark it up nor subsidise it.

A church that would rather not absorb it turns on **fee coverage** (R13.5): the giving page offers
the giver the option of adding the processing fee to the gift. It is shown honestly and is never
on by default. The gift records what the giver paid, what Stripe took, and whether the giver chose
to cover it, so the statement and the deposit both reconcile.

## Card data

Never on our servers. The giver types the card into Stripe's own hosted page or an embedded Stripe
Element, which posts it to Stripe. We see an id afterwards. That keeps both the church and the
platform in PCI scope SAQ-A, which is the only scope this product will ever operate in.

## What we write down

A gift row records: who gave (or nobody, for an anonymous gift), the fund, the amount in whole
cents, the method, the day it was received, and for an online gift the payment intent, the charge
and the fee. Cash and cheques arrive through a counting session, which is a separate control
described below. Nothing is deleted once a count is closed; a mistaken gift is refunded or the
count is reopened.

## The counting session

Cash and cheques are entered in a batch (R13.10 to R13.12):

1. Two counters are named. This is the dual control the church's auditor asks about.
2. They declare the total they believe is in the bag, before a single line is entered.
3. The lines are entered: giver, fund, amount, method, cheque number.
4. The count closes only when the entered total matches the declaration, or somebody writes down
   why it does not. The note is kept with the batch.

A closed count stops taking lines, because it is now the record of a deposit.

## Environment

| Variable | What it is |
|---|---|
| `STRIPE_SECRET_KEY` | The platform's own Stripe key. Creates connected accounts and reads their state. Never used to take a payment onto a platform balance. |
| `STRIPE_WEBHOOK_SECRET` | Verifies every webhook. An event without a valid signature is refused. |

Without a key, the giving screens still work for cash and cheques, and the online giving screen says
the platform is not set up for it.

## A gift that repeats

The subscription lives on the church's own account, under the same rule: no application fee, so
every collection settles to the church and Stripe's fee comes off the church's balance. Each
collection is written down as its own gift, because that is what a statement is built from.

The giver changes or stops it in **Stripe's billing portal**, which the thank-you page opens for
them. There is no account on our side to sign in to, so the checkout session Stripe has just handed
them is what stands in: nobody else has it, and it is spent when they leave the page.

## Statements

A year-end statement is written to IRS Publication 1771: the church's legal name and address, each
gift with its date and amount, any non-cash gift described and **not valued** by the church, the
sentence that no goods or services were provided in exchange, and the acknowledgment line for a
giver whose single gift reached $250.

Two things are still owed before this is correct for every church: **household roll-up** (R13.18),
so a couple receives one statement rather than two, and **quid pro quo** (R13.20), so a $100 gala
ticket with a $40 dinner is stated as a $60 contribution. Until both land, a church with either
case has to correct the statement by hand.

**A CPA reads a sample statement before 0.3 ships.** That is a release gate in the PRD, not a
nicety: a statement that is wrong in January is wrong for every giver at once.
