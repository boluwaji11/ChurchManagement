# Connecting a church's own messaging

HRT-286, HRT-287, HRT-123. Written 10 October 2026, before any vendor account
exists, so that the first vendor does not get to decide what the second one
looks like.

Nothing in the repository sends a message. There is no queue, no composer and
no message table. What is built is the wiring: the state of a church's
connection to its own providers, the state of the registrations those providers
require, and who in the congregation has agreed to be contacted.

## The position

The church owns every account and pays every bill. We carry the forms.

Their Stripe, their Twilio, their Resend, their card. We resell nothing, which
keeps the cost of a thousand churches' messaging off a donation-funded balance
sheet. What changes against the usual bring-your-own arrangement is that
connecting a provider is a button and a redirect rather than a page of
instructions and a key to paste.

## What is built

**Email is connected, as of 13 October 2026.** HRT-287 shipped `/settings/email`, where a church
connects the account its email leaves through. Two ways in, and both prove the connection against
the church's own account before anything is written down, so a church never holds a saved provider
that cannot send.

- **Its own mail server.** Google Workspace, Microsoft 365, or whoever hosts its mail. Nothing
  changes at the registrar, because a church already sending from its domain already has SPF, DKIM
  and DMARC right. `verify` opens the session and authenticates without sending, and a refusal comes
  back in the server's own words, which is how a volunteer learns they need an app password rather
  than the one they sign in with.
- **Resend.** The church pastes a full-access API key, we register the root of its From address as a
  sending domain, and the three records Resend generates are kept and shown until they are published.

Resend connects by API key rather than by OAuth. There is no dashboard screen for creating an OAuth
client, the metadata-document route means hosting a file whose URL is the client id, and the loopback
redirect a remote client has to use cannot reach a tenant subdomain in development. The grant is the
same either way, because `full_access` is Resend's only scope that can create a domain, and the
screen says so above the press. OAuth can be added later as a second way in, against the same
tables.

Whether the records are published is read from public DNS rather than from Resend, which is what
every mail server on the internet reads anyway and which needs no credential. So nothing sealed is
opened in a request path: the plaintext is in hand from the form at the moment the connection is
proved, and after that only the worker that sends has any business reading it.

| | |
|---|---|
| `packages/db/src/messaging/contract.ts` | One interface every provider implements, the registration state machine, and the two rules that decide whether anything may be sent. Pure, and tested. |
| `church_providers` | A church's own account with a vendor. The credential is sealed and no read path selects it. |
| `church_sending_domains` | A domain and how far its verification has got, with the records we asked for kept so the screen can show them again. |
| `church_registrations` | The carrier brand and campaign, each with its own state, its external id and why it was refused. |
| `contact_consent` | Per member per channel: what they agreed to, how, and the evidence. |
| `sealCredential` / `openCredential` | AES-256-GCM under `PROVIDER_CREDENTIAL_KEY`, separate from the note key, so a leak of one is not a leak of the other. |

## The order the work runs in

Run by lead time rather than by what the church asks for next. Two of these
take days, and the church is standing at the screen.

1. **The church's own details.** Legal name, registration number, registered
   address. HRT-284, built. Everything downstream prefills from it.
2. **Stripe.** HRT-251 is the in-product onboarding.
3. **Start the carrier registration and the domain verification immediately**,
   in the background, before the church has asked to text or to send.
4. **Consent capture and the unsubscribe path**, which the registration depends
   on.
5. **Sending**, by which time the brand is approved and the domain is verified.

The third step is the one that matters. It is the difference between a church
being told to come back on Thursday and a church finding it already works.

## Consent comes before the registration

A carrier's campaign form asks the church to describe how people opted in. A
congregation imported from a spreadsheet has no answer, and submitting anyway
asks the church to write something untrue on a compliance form.

So `readyToSubmit` refuses a campaign while nothing is recorded, and
`mayContact` refuses to text somebody whose consent arrived in an import. An
import is enough for mail a church already owes somebody. It is not enough to
put them on a list.

Withdrawal stops everything, including what the church owes them. Somebody who
asked to be left alone has asked to be left alone.

## Email, and why the church's inbox survives it

The blueprint that came with this work said Resend returns MX records for the
root domain that would take over the church's inbox, and said to filter every
MX record out. Both halves are wrong.

Resend puts its SPF record and its return-path MX on a `send.` subdomain. The
church's root MX, the one pointing at Google Workspace or Microsoft 365, is
never in the picture, and there is no root SPF record to merge into. Stripping
the MX records would remove the return path on `send.`, which carries bounces
and complaints, and losing those ruins a sending reputation faster than
anything else on this page.

The switch that would genuinely take a church's mail is Resend's **inbound**
setting on a root domain. It stays off.

So:

- Register the **root** domain.
- DKIM TXT at the root, `resend._domainkey`.
- SPF and the return-path MX on `send.`, exactly as Resend generates them.
- Inbound off, always.

The church then sends as `sarah@fairviewchurch.org` with the signature aligned
to the address a member reads, DMARC passes on that alignment, and their
Workspace inbox is untouched. The `mail.` subdomain and the Reply-To header it
needs are both unnecessary, because the From address is already the real one.

Reply-To stays in the design as the fallback for a church whose DNS we cannot
reach.

HRT-283 reads all of this back to the church before anything is changed.

## Texting, and the one thing that may block it

Twilio Connect does what is wanted: the church authorises our application
against their own Twilio account, Twilio bills them directly, and we buy the
number and send on their behalf.

**The spike to run first.** Twilio Connect returns a *subaccount* SID under the
church's account. Twilio's A2P documentation says a Primary Business Profile
cannot be created on a subaccount, and that brand sharing is largely
unavailable to ISV brands. The carrier registration may therefore be
unreachable through the access Connect hands us.

**The spike is answered, and the answer is no.** Twilio's own limitations page
says it plainly: it is not currently possible to create a Primary Business
Profile on a subaccount. Twilio Connect returns a subaccount SID, so the
automatic registration we wanted through Connect cannot be built. Nothing needs
running to find this out.

Twilio's ISV onboarding guide goes further and names the architecture it wants
instead: a subaccount per customer, under the ISV's own parent account, which
it calls the preferred option because it separates each church's traffic and
keeps one church's noncompliance off the others. That is the shape that works,
and it makes the platform the parent, which makes the platform the biller.

So HRT-286 is not blocked on a test any more. It is blocked on one decision,
set out under "What the answer means" below.

The steps that were here, kept for the record:

1. Create a Connect app on the platform Twilio account.
2. Authorise it against a second Twilio account standing in for a church.
3. With the returned SID and the platform auth token, try to create a Primary
   Business Profile and an A2P brand.
4. If it is refused, the alternatives are: ask the church to create the brand
   in their own Twilio console and give us the SID, or move to a subaccount
   model where the platform account is the parent, which changes who pays and
   needs its own decision.

Until that answer exists, HRT-286 stays unwritten.

## What is deliberately absent

- **Any send path.** No queue, no composer, no templates, no delivery.
- **Entri.** $249 a month against a step each church performs once. The
  pre-flight, two records with copy buttons and a walkthrough for the registrar
  we detected gets a church through it. Revisit when donation coverage is above
  1.0 and we can count how many churches stall there.
- **Open-ended website authoring.** HRT-285 provides one public homepage assembled from designed
  sections. Churches can edit and reorder them. Arbitrary layouts and multi-page authoring remain
  out of scope.

## How to create the accounts

The console steps, and what to hand back, are in
[messaging-setup.md](messaging-setup.md). The Twilio spike below is Part 2b of
that document.

## What to supply when the accounts exist

| Vendor | What is needed |
|---|---|
| Twilio | A Connect app on the platform account: its SID, its secret, and the authorise URL. Plus a second account to stand in for a church while the spike runs. |
| Resend | Nothing. Each church makes its own full-access key in its own Resend dashboard and pastes it in, which is HRT-287 as shipped. An OAuth client would only save it the paste, and it is in [messaging-setup.md](messaging-setup.md) if we ever want it. |
| Both | `PROVIDER_CREDENTIAL_KEY`, 32 bytes base64. Generate with `openssl rand -base64 32`. |

## Sources

- Resend OAuth: https://resend.com/changelog/oauth-support
- Resend domains: https://resend.com/docs/add-a-domain
- Twilio Connect: https://www.twilio.com/docs/iam/connect
- Twilio A2P limitations: https://support.twilio.com/hc/en-us/articles/1260804728069-Current-Limitations-of-A2P-10DLC
- Twilio ISV onboarding: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv
