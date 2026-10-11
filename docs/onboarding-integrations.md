# Setting a church up: Stripe, the domain, texting and email

A design note, dated 9 October 2026. Nothing here is approved and nothing here is built. It exists
so the decisions below are argued once and can be read again when the work is asked for.

The source is a narrative of one church's first hour (Pastor Sarah, Fairview Church), an
architecture sketch, and a blueprint for verifying a sending domain. This note says which parts
hold, which parts are wrong, and what the work would actually be.

## The idea worth keeping

For a church of this size the hard part of a management system is the plumbing. The records are
easy. Stripe, DNS and carrier registration are where a volunteer with four hours a week stops.

Everybody else solves it one of two ways. They resell the messaging and charge a subscription that
covers the support, or they show an empty box labelled "API key" and wish the church luck. There is
a third position, and it is ours: **the church owns every account and pays every bill, and we do the
setup for them.** Their Stripe, their Twilio, their Resend, their card. We carry the forms.

That sits inside the bring-your-own-credentials rule rather than against it. We resell nothing. What
changes is that connecting a provider becomes a button and a redirect instead of a page of
instructions and a key to paste. It is the same argument the whole product rests on: Rock RMS's
price with Breeze's usability.

## Where it stands today

**Giving is mostly built.** HRT-238 put Stripe Connect in at a zero platform fee against the
church's own account with direct charges and the webhook. HRT-239 built the giving page a church
links to from its own website. HRT-242, HRT-244 and HRT-245 cover the reports, the member's own
giving and a lapsed recurring gift.

The missing piece is **HRT-251**, Stripe Accounts v2: creating the account in-product, the
onboarding link, the account session. That story is the green tick in Act 2 of the narrative. It is
already on the board as New, before 0.3 ships. Act 2 needs no new story.

**Messaging is deferred by name.** Acts 3 and 4 are Twilio and Resend. F16 was built once and taken
out again, and the tables went in migration 0058. The board order holds: foundation, services and
check-in, service ops, GA, the children's paperwork, money. The stories below are parked.

## Act by act

### Act 1, the domain

What the narrative calls a silent background scan should be a **pre-flight that shows its working**.
A DNS lookup tells us the church's mail provider, its registrar, its existing SPF, its DMARC policy
and whether anything we would add collides with anything already there. That is cheap and it is the
single most reassuring screen in the whole sequence:

> Your email is on Google Workspace. Your domain is at GoDaddy. We will add two records. Everything
> you already have stays where it is.

The word "silently" has no place here. A church hands us its members and its giving on the strength
of a promise that we are legible. Reading their public DNS and telling them what we found is a
feature. Reading it and saying nothing is a liability, for the sake of a few seconds.

### Act 2, Stripe

The flow holds. The claim underneath it does not.

The narrative has the platform reading the church's EIN and legal address back out of Stripe so the
church never types them twice. Stripe's own documentation says that for Standard and Express
accounts, which is to say any account where `controller.requirement_collection` is `stripe`, only a
subset of the `company` object is returned once an Account Link or Account Session has been created.
The full tax ID is not reliably readable. The trick does not work.

The fix is duller and better. **Ask for the legal name, the EIN and the registered address once, on
the church's own record, in our own form.** The tenant row already carries `legal_name` and the
address. An EIN column is a small migration. We prefill Stripe's onboarding with it, and later the
carrier registration, and the church types it once because we asked once.

### Act 3, texting

Twilio Connect is real and does what the sketch describes. The customer authorises our application
against their own Twilio account, Twilio bills them directly, and we buy the number and send on
their behalf. Billing never touches us.

**There is one documented obstacle and it is serious.** Twilio Connect returns a *subaccount* SID
under the church's account. Twilio's A2P documentation says a Primary Business Profile cannot be
created on a subaccount, and that brand sharing is largely unavailable to ISV brands. The carrier
registration in Act 3 is therefore not obviously reachable through the access Connect hands us.

This needs a spike against a live Twilio account before a line of it is written. It is the step most
likely to be undeliverable in the shape the narrative draws.

**Consent comes first.** A2P campaign registration asks the church to describe how people opted in,
and the TCPA wants prior express written consent for anything promotional. A congregation imported
from a spreadsheet has no consent record. So the consent capture and the unsubscribe path are a
prerequisite for submitting the registration honestly, which puts them ahead of the registration in
the order of work rather than after it.

### Act 4, email

Resend supports OAuth 2.1 with PKCE, so "Connect Resend" is a real button. The church authorises,
we hold a scoped token, their card pays for their volume.

**The domain blueprint in the source is solving a problem that does not exist, in a way that breaks
something that does.** It says Resend returns MX records for the root domain that would take over
the church's inbox, and instructs us to filter every MX record out before applying them.

Resend puts its SPF record and its return-path MX on a `send.` subdomain. The church's root MX, the
one pointing at Google Workspace, is never touched, and there is no SPF collision at the root to
merge. Stripping the MX records would remove the return-path record on `send.`, which is what
handles bounces and complaints, and losing those is the fastest way to ruin a sending reputation.

The switch that would genuinely steal a church's mail is Resend's **inbound** setting on a root
domain. We leave it off, always.

So the correct shape:

- Register the **root** domain, `fairviewchurch.org`.
- DKIM TXT at the root, `resend._domainkey`.
- Resend's SPF and return-path MX on `send.`, applied as Resend generates them.
- Inbound stays off.

The church then sends as `sarah@fairviewchurch.org` with DKIM alignment, their Workspace inbox is
untouched, and DMARC passes on alignment at the root. The `mail.` subdomain in the narrative and the
Reply-To header it needs both become unnecessary, because the From address is already the real one.

Reply-To stays in the design as the fallback for a church whose DNS we cannot reach.

### Act 5, the website

This is the part to cut.

A website builder is a second product. It carries a page editor, a media library, SEO, custom
domains, certificates at scale, abuse and takedown handling, and public traffic. The cost of every
other thing we run scales with the number of churches. The cost of this one scales with the number
of *visitors*, which is the one shape a donation-funded platform cannot absorb. The market is also
full: Wix, Squarespace, Subsplash, Tithe.ly Sites, Nucleus.

The need underneath it is real and much smaller. **A church with no website needs somewhere to put
the Give button.** It does not need a content management system.

We are close to that already. HRT-239 built a giving page a church links to. Extend it into one
generated public page per church, drawn from the record we already keep: name, logo, brand hue,
address, service times, a way to make contact, Give. No editor, no media, no promises about search
ranking. One page at `connectapp.church/<slug>`. If the church later builds a real site, they link
to it from there and nothing is wasted.

For a church that already has a site, the embed snippet from the narrative is cheap and worth
having, and the pre-flight from Act 1 already knows which registrar's instructions to show.

## The order

The narrative runs Stripe, then Twilio, then Resend, in the order the church asks for them. The
right order is by lead time, because two of these take days and the church is standing at the
screen.

1. Ask for the legal details once. Everything downstream is prefilled from them.
2. Stripe onboarding.
3. **Start the carrier registration and the domain verification immediately**, in the background,
   before the church has asked to text or to send. Both are measured in days.
4. Consent capture and the unsubscribe path, which the registration depends on.
5. Sending, by which time the brand is approved and the domain is verified.

That one reordering is the difference between a church being told to come back on Thursday and a
church finding it already works.

## What the narrative leaves out, and it is most of the work

Every screen in the source story shows a green tick. Not one shows a pending state.

A2P brand and campaign review takes days and campaigns are rejected, sometimes for reasons that read
as nonsense to a pastor. Stripe verification sits in `pending` and asks for a document. DNS
propagates. A church changing its bank details often needs a board meeting.

So the pending state is the product, and building it is most of the job: what the church sees for
the three days a campaign is in review, what it is told when the campaign is refused and what it can
do about it, and how it gets itself unstuck without writing to us. Support is the real cost here,
and four integrations is four new ways for a church to get stuck.

## Cost

Entri Connect, the widget that logs a church into its registrar and writes the records for it, starts
at **$249 a month**, around $2,988 a year. Its own terms cap a developer with no contract at 50
domain connections a month, while the plans page advertises 600 a year, so the real allowance needs
confirming with their sales team.

Against a platform whose published metric is donations divided by infrastructure cost reaching 1.0,
that is likely to be the largest single vendor line, and it buys convenience on a step each church
performs exactly once.

**Recommendation: no Entri in v1.** The pre-flight from Act 1, two records with copy buttons, and a
walkthrough for the registrar we detected gets a church through it. Revisit when coverage is above
1.0 and we can count how many churches actually stall there.

## Before any of this is committed to

1. A spike against a live Twilio account: can a Connect-authorised subaccount reach the A2P
   registration APIs, or does the Primary Business Profile restriction block it.
2. Confirm against a Standard Connect test account exactly which `company` fields come back after an
   Account Link exists.
3. Confirm Resend's OAuth scopes cover domain creation and verification, rather than sending alone.
4. Ask Entri what a church-sized account actually costs.

## Sources

- Resend OAuth: https://resend.com/changelog/oauth-support
- Resend domains: https://resend.com/docs/add-a-domain
- Twilio Connect: https://www.twilio.com/docs/iam/connect
- Twilio A2P limitations: https://support.twilio.com/hc/en-us/articles/1260804728069-Current-Limitations-of-A2P-10DLC
- Twilio ISV onboarding: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv
- Stripe accounts: https://docs.stripe.com/api/accounts
- Entri plans: https://www.entri.com/2025-site/plans
- Entri terms: https://www.entri.com/legal/terms-of-service
