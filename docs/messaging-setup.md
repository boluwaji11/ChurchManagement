# Setting up the Twilio and Resend accounts

What to do in each vendor's console, and what to hand back. Written for whoever
holds the ConnectApp platform accounts.

Console layouts change. Each step says what has to exist rather than promising a
menu path, so if a label has moved, search the console for the words in bold.

Nothing here costs a church anything. These are the *platform's* applications,
which each church then authorises against its own account, so each church is
billed by Twilio and Resend directly.

---

## Part 1. Resend, for email (HRT-287)

**Nothing in this part is needed any more.** HRT-287 shipped on 13 October 2026 with each church
pasting its own full-access Resend key, made in its own Resend dashboard, so the platform holds no
Resend application and there is nothing for you to obtain. The rest of this part is kept because an
OAuth client would still save a church that paste, and if we ever want it this is what it takes.

**There is no screen for this.** An earlier version of this document said to
create an OAuth application in the Resend dashboard. That was wrong, and it is
why looking for it found nothing. Resend's own guide says it plainly: "we don't
have a central place in the app to create clients."

Source: https://resend.com/docs/guides/building-a-resend-oauth-client

### The three ways Resend gives out a client id

1. **Pre-registration.** Resend issues a fixed `client_id` and `client_secret`
   by hand. The guide does not say how to ask, so it is an email to them.
   Resend recommends this for a remote third-party client like ours, because
   they have no self-service verification yet.
2. **A Client ID Metadata Document.** We host a JSON file on our own domain and
   its HTTPS URL *is* the `client_id`. Nothing is registered with Resend at all.
3. **Dynamic Client Registration.** `POST https://api.resend.com/oauth/register`.

### The scopes, which are not what this document first claimed

There are two, and neither is per-resource:

| Scope | What it covers |
|---|---|
| `emails:send` | `POST /emails` and nothing else |
| `full_access` | every other route, which includes creating and verifying a domain |

Omitting `scope` grants both. We create and verify a sending domain for the
church, so `emails:send` is not enough and **`full_access`** is what HRT-287
needs. Asking a church to grant full access to its Resend account is a real
decision, and it should be said on the screen where the church presses
Connect rather than buried here.

### What to do

Route 2 needs nothing from Resend and no waiting, so take it first and treat
route 1 as the thing that makes us look legitimate later.

1. Decide whether we are comfortable asking churches for `full_access`. If not,
   HRT-287 cannot create the sending domain and the church has to make it in
   its own Resend dashboard, which is a different and smaller story.
2. Email Resend asking to pre-register ConnectApp as an OAuth client, giving
   the name, our redirect URI and `full_access`. This is route 1, and the reply
   may take days, which is why it goes early.
3. Meanwhile, nothing is needed from you for route 2. The metadata document is
   a file in this repository, served from our own domain, and building it is
   part of HRT-287.

### What to send me

Nothing. `full_access` was accepted on 13 October 2026, on the condition that the screen says what
the key can do before the church presses Connect, and it does.

### The endpoints, for the record

- Authorise: `https://api.resend.com/oauth/authorize`
- Token: `https://api.resend.com/oauth/token`
- Revoke: `https://api.resend.com/oauth/revoke`
- Register: `https://api.resend.com/oauth/register`

Our redirect URI is `https://connectapp.church/api/providers/resend/callback`.
A remote client's redirect must be HTTPS on a domain we own, so development
uses a loopback URI such as `http://127.0.0.1:4488/api/providers/resend/callback`
rather than a `localhost` one. Resend treats `localhost` and `127.0.0.1` as
different hosts, so the one registered is the one that has to be used.

**A client belongs to one redirect URI, and registering is the only way to
change it.** Resend matches the redirect exactly, and the registration call
hands back no token for editing the client afterwards, so a client registered
against the wrong address is replaced rather than corrected. Pointing the
production deployment at a client registered for development is what that
looks like from the church's side:

```json
{"error":"invalid_request","error_description":"redirect_uri is not registered for this client"}
```

Each environment therefore gets its own client, and `RESEND_OAUTH_CLIENT_ID`
holds that environment's. A new one is checked before it is handed to a church
by asking for the consent page with it: a 302 to `resend.com/oauth/authorize`
means the redirect is registered, and the JSON above means it is not.

---

## Part 2. Twilio, for texting (HRT-286)

This one has a real unknown, and the unknown has to be settled before the story
can be written. Part 2a creates the application. Part 2b is a test whose answer
decides how texting works, and may change who pays.

### Part 2a. The Connect app

1. Sign in to Twilio as the ConnectApp platform account.
2. Create a **Connect App**. Search the console for "Connect Apps"; it sits
   under the account or settings area rather than under Messaging.
3. Name it **ConnectApp** and give it our company URL. A church sees this when
   it authorises.
4. Set the **authorise redirect URL** to
   `https://connectapp.church/api/providers/twilio/callback`, and note whether
   Twilio allows a second one for `http://localhost:4488/...`.
5. Set the permissions to include **reading and writing phone numbers** and
   **sending messages**. We buy a number on the church's behalf, so read-only
   is not enough.
6. Save, then copy the **Connect App SID**, the **secret** (sometimes called
   the Connect App secret or friendly secret), and the **authorise URL** Twilio
   generates for it.
7. Create or nominate a **second Twilio account** to stand in for a church in
   the next part. A trial account is fine. It must not be the platform account.

### Part 2b. The spike, which settles how texting works

By law US carriers block texts from unregistered businesses, so a church's
Twilio account has to carry an **A2P 10DLC registration**: a Primary Business
Profile, then a brand, then a campaign. Our intention is to submit that for the
church automatically using its EIN and address, so nobody fills in a carrier
form.

The question is whether the access Twilio Connect gives us is enough to do it.
Connect hands back a **subaccount** SID under the church's account, and Twilio's
own A2P documentation says a Primary Business Profile cannot be created on a
subaccount. If that holds, the automatic path does not exist and we need a
different shape.

Run this before I write any of HRT-286:

1. From the Connect app, go through the authorise flow against the **second**
   account. Approve it as though you were a church.
2. Note the **account SID** Twilio returns, and whether it is the second
   account's own SID or a new subaccount SID beneath it.
3. Using that SID with the platform auth token, try to create a **Primary
   Business Profile**. The console path is under Trust Hub.
4. If that succeeds, try to create an **A2P brand** against it.
5. Write down exactly what happened at each step, including the text of any
   refusal.

### What the answer means

- **Both succeed.** The automatic path works. HRT-286 is buildable as designed,
  the church presses one button and we submit the registration.
- **Either is refused.** Two ways out, and it is your decision, not mine,
  because the second changes who pays:
  - **The church registers itself.** It creates the brand in its own Twilio
    console and pastes the SID into ConnectApp. More work for the church, and
    it keeps paying Twilio directly.
  - **The platform account becomes the parent.** Each church is a subaccount of
    ours, which makes registration reachable, and makes **us** the biller. That
    contradicts "bring your own messaging" and needs deciding on its own
    terms.

### What to send me

| Item | Looks like |
|---|---|
| Connect App SID | starts `CN` |
| Connect App secret | opaque |
| Authorise URL | a twilio.com URL |
| Second account SID | starts `AC` |
| Spike result | what happened at steps 3 and 4, and any refusal text |

---

## Where the credentials end up

The platform's own ids and secrets go in the environment, never in the
repository: `RESEND_OAUTH_CLIENT_ID`, `RESEND_OAUTH_CLIENT_SECRET`,
`TWILIO_CONNECT_SID`, `TWILIO_CONNECT_SECRET`.

A church's own credentials are different, and never touch the environment. They
go in `church_providers.credential`, sealed with the church's own key, and are
read only by the worker that uses them. See R21.15 and migration 0144.
