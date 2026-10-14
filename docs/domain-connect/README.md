# One press instead of three records

HRT-289. What it takes for a church to put its three sending settings in place without typing
anything, and what has to happen outside this repository first.

## The mechanism

Domain Connect is an open standard, MIT licensed, with about twenty DNS companies implementing it,
GoDaddy, IONOS, Cloudflare and Squarespace Domains among them. A church presses one button here,
lands on its own DNS company's screen, approves, and the records are written. Nothing is pasted and
nothing is typed.

Entri sells the same thing for $249 a month. What Entri is selling is the onboarding below, already
done.

## The catch, said plainly

**The press only works where our template has already been onboarded with that DNS company.** The
spec is explicit: a DNS company applies a template it already holds, named by `providerId` and
`serviceId`. It will not apply one it has never seen.

So the sequence is: publish the template, submit it, wait for companies to pick it up, and until
then a church reads the three settings and types them. The screen never shows a press that cannot
work, because it asks the domain first.

## The template

[`connectapp.church.email.json`](connectapp.church.email.json), named `providerId.serviceId.json` as
the repository requires.

Three records, matching what a sending account generates:

| | |
|---|---|
| `TXT` at `resend._domainkey` | `p=%dkim%`, the signature that proves the mail is the church's |
| `CNAME` at `rsend` | the path the mail leaves by |
| `CNAME` at `send` | the path a bounce comes back on |

The values are variables because every church's key is its own. `txtConflictMatchingMode` is set on
the TXT record, so a company that already holds a signature at that name replaces it rather than
leaving two.

## What has to happen outside this repository

Three things, in order. The first two are yours.

### 1. A signing key, and a DNS record for its public half

The synchronous flow is signed, so a DNS company can tell our request from somebody else's. That
needs a key pair and the public half published on `connectapp.church`:

```
openssl genrsa -out domain-connect.key 2048
openssl rsa -in domain-connect.key -pubout -out domain-connect.pub
```

Publish the public key as a TXT record at `_dck1.connectapp.church`, as one line with the header,
footer and newlines removed. Keep the private key out of the repository: it goes in the deployment's
own secrets as `DOMAIN_CONNECT_PRIVATE_KEY`, and the record's name goes in
`DOMAIN_CONNECT_KEY_ID` (`_dck1`).

### 2. The submission

1. Open the [online editor](https://domainconnect.paulonet.eu/dc/free/templateedit), load the
   template, and test it against an apex domain and a host. Copy the test-results link it gives you.
   **Done, 13 October 2026.** Both tests pass, with `dkim`, `rsendhost` and `sendhost` filled in, and
   the link the editor gave back is in [test-results.md](test-results.md). A pull request without it
   is refused, and a link that does not match the template submitted is refused too, so it is
   regenerated whenever the template changes.
2. Lint it: `dc-template-linter -tolerate warn connectapp.church.email.json`, which must exit 0.
   `-merge-or-fail` exiting 0 means it qualifies for the fast track.
3. Open a pull request against `Domain-Connect/Templates` using their own pull request template
   unaltered, with the test-results link in the field they ask for.

What to send me when it is through: nothing. The screen reads each church's domain and offers the
press wherever that company holds the template.

### 3. Then it lights up on its own

A church whose domain is at a company that holds our template sees one press. Everywhere else the
three settings stay as they are, with the right page and the right words, which is what every church
gets today.

## Why not an API token instead

A church could paste a Cloudflare or Vercel token and we would write the records in a second. It
works today and needs nobody's permission. It is also a church being asked to make an API token,
which is the exact thing this whole screen exists to avoid.
