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

This one has no unknowns. Do it first and the story can be built.

### What you are creating

An **OAuth application** on the ConnectApp Resend account. A church presses
"Connect Resend" in ConnectApp, lands on Resend, signs in to its own Resend
account, approves, and comes back. We never see its password and never hold its
API key.

### Steps

1. Sign in to Resend as the ConnectApp platform account, not a church's.
2. Find **OAuth** in the account or team settings and create a new OAuth
   application. If you cannot find it, the feature announcement is at
   https://resend.com/changelog/oauth-support and links to the current page.
3. Name it **ConnectApp**. This name is shown to every church on the approval
   screen, so it should read as us.
4. Set the **redirect URI**. Add both:
   - `https://connectapp.church/api/providers/resend/callback`
   - `http://localhost:4488/api/providers/resend/callback`
   The second is for development. If only one is allowed, create a second
   application for development and send me both sets.
5. Choose **scopes**. This is the step that matters. We need to create and
   verify a sending domain on the church's behalf, so sending scopes alone are
   not enough. Grant whatever covers **domains: create**, **domains: read** and
   **domains: verify**, plus **emails: send**. If the scope list uses different
   words, send me the list and I will say which to tick.
6. Save, then copy the **client id** and the **client secret**. The secret is
   usually shown once.

### What to send me

| Item | Looks like |
|---|---|
| Client id | a short opaque string |
| Client secret | a longer opaque string, shown once |
| Redirect URIs | the ones you registered |
| Scopes granted | the exact names as the console spells them |

Send the secret through something private, not chat. It goes in `.env.local`
and in the deployment's environment, never into the repository.

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
