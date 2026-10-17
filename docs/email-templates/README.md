# The three messages Supabase Auth sends

Confirming an address, resetting a password and signing in by link are sent by
Supabase rather than by this product, because Supabase mints and owns the token
in the link. What it does not own is how the message looks, or which mail
server it leaves through.

## Send them through Resend

Supabase's own mail server is for development. It is rate limited to a handful
of messages an hour across the whole project, shared with everybody, and a
church that signs up after the limit is reached is told "Too many emails have
gone out just now" on its first screen.

Project Settings, Authentication, SMTP Settings:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | a Resend API key with sending access |
| Sender email | `hello@connectapp.church` |
| Sender name | `ConnectApp` |

The sender has to sit on a domain Resend has verified, which `connectapp.church`
is. Afterwards raise the hourly ceiling under Authentication, Rate Limits: the
low default is there for the shared server and has no reason to stay once the
mail is our own.

## The templates

The HTML beside this file is generated from the same brand shell as the
invitation, the welcome and the approval, so all six messages a church sees are
one product. Paste each into Authentication, Email Templates:

| File | Template |
|---|---|
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset password |
| `magic-link.html` | Magic link |

`{{ .ConfirmationURL }}` is Supabase's own placeholder for the link it mints
and reaches the template unescaped. Leave it exactly as it is.

**They are generated, so they are not edited here.** The wording lives in
`packages/i18n` under `mail.verify.*`, `mail.reset.*` and `mail.magic.*`, and
the drawing lives in `packages/mail/src/brand.ts`. Change either and emit them
again, then paste.
