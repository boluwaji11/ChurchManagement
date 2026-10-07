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

### Accounts v1 and v2

Connected accounts are created today through the **Accounts v1** API (`stripe.accounts.create`).
Stripe no longer recommends v1 for new integrations and refuses it unless a platform enables
[Accounts v1 support](https://dashboard.stripe.com/settings/developers/api-policies/feat_accounts_v1_support)
in the dashboard, which this platform has done.

**HRT-251** moves this to Accounts v2 before 0.3 ships. It is not a one-line change: it touches
account creation, the onboarding link, the account session behind the embedded views, and
`account.updated`, which under v2 is a v2 event delivered to an event destination rather than to
the classic webhook endpoint this product handles today. Gifts themselves are unaffected: a payment
intent on a connected account is a v1 object either way.

### The nonprofit rate

Stripe charges a registered 501(c)(3) **2.2% + 30¢** a transaction instead of 2.9% + 30¢, on an
account where more than 80% of the volume is tax-deductible giving. A church asks for it by email
to `nonprofit@stripe.com` with its EIN or determination letter, and Stripe **does not backdate it**,
so every gift taken before the church asks is charged at the full rate.

Settings → Money → Online giving says so beside the account, and drafts the email with the church's
name and Stripe account already in it. Nothing is sent from this product: the church's own mail
client opens and the church presses send.

### Bank debits

Stripe ships a new account with **ACH debits off**, and a card is 2.2% + 30¢ while a bank debit is
0.8% capped at $5. On a $4,000 gift that is $5 against $88, so this product asks for the capability
when it creates the account and switches the method on as soon as Stripe will take payments. A
church can still turn it off in its own Stripe settings.

### When a bank gift counts

A card answers in a second. A bank debit is an instruction: the giver authorises it, Stripe moves
the money over the following days, and the bank can still return it after that. So a gift carries a
status.

| What arrives | What the gift does |
|---|---|
| `payment_intent.processing` | Written with status `pending`. It shows on the giving list as "On its way" and is in no total, no fund balance, no campaign and no statement. |
| `payment_intent.succeeded` | The same row settles, keeping its id, its fund split and whoever it was attached to. The charge and the fee Stripe took are written then, because only settlement knows them. |
| `payment_intent.payment_failed` | Status `failed`, with the bank's own words in `failure_reason`. |
| `charge.dispute.created` | A return after settlement. The money has gone back out of the church's balance, so the gift fails and every total comes down with it. |

The date on the gift is the day the giver gave, which is the date the IRS wants on the statement,
and it does not move when the money lands.

The giver is told the same thing on the thank-you page: a bank transfer takes a few days to arrive.

## Who pays the processing fee

The church does, out of its own Stripe balance, at whatever rate Stripe gives it. Stripe discounts
for registered nonprofits in the US, which a church applies for directly with Stripe. We neither
mark it up nor subsidise it.

A church that would rather not absorb it turns on **fee coverage** (R13.5): the giving page offers
the giver the option of adding the processing fee to the gift. It is shown honestly and is never
on by default. The gift records what the giver paid, what Stripe took, and whether the giver chose
to cover it, so the statement and the deposit both reconcile.

## Reading Stripe without leaving ConnectApp

Giving → Payouts draws Stripe's own **Connect embedded components** against an account session this
server asks for, so a treasurer reads the balance, the payouts and the payment list without going
to stripe.com.

Every acting feature on those components is switched **off**: no refunds, no disputes, no payout
schedule, no changing the bank account. Those stay in the church's own Stripe dashboard, because
the church is the account holder there and Stripe carries the risk under the Standard model. The
moment this platform starts performing those actions, it starts taking on the liability that makes
"never touch the money" true.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is what the browser needs for this. It identifies the
platform; it authorises nothing.

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

## A split gift

A gift divided between funds is written as **one gift a fund**, not as a gift with parts. A
treasurer's question is always "how much went to the building", and every total, statement,
campaign and export already answers that one row at a time. The fee sits on the first row, because
Stripe charged it once on the whole payment, and the index that stops a redelivered webhook writing
twice takes the fund as well as the payment.

## Campaigns

A campaign is a target over a period against **one fund**, which is what makes progress countable:
every gift to that fund inside the period counts once, and nothing is reconciled by hand. A church
raising for a roof makes a Building fund and a campaign against it.

A pledge belongs to the person who made it, and progress against it is read across their
**household**, so a couple who committed once and gave on one card reads as having kept it.

## Statements

A year-end statement is written to IRS Publication 1771: the church's legal name and address, each
gift with its date and amount, any non-cash gift described and **not valued** by the church, the
sentence that no goods or services were provided in exchange, and the acknowledgment line for a
giver whose single gift reached $250.

A church chooses whether a statement is written **a person or a household**, on the statements
screen itself. With households chosen, a couple who gave on one card receive one sheet under the
household's name, and anybody with no household stands on their own either way.

**Quid pro quo** (R13.20) is still owed: a $100 gala ticket with a $40 dinner should state a $60
contribution, and until that lands a church selling anything with a benefit has to correct the
statement by hand.

**A CPA reads a sample statement before 0.3 ships.** That is a release gate in the PRD, not a
nicety: a statement that is wrong in January is wrong for every giver at once.
