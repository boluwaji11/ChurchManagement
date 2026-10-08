# Architecture

Decisions that are expensive to change later. Requirement IDs refer to [../PRD.md](../PRD.md).

## Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript, end to end | One language across web, API, jobs, and the Phase 2 desktop app, so song and plan logic is written once and shared. |
| Repo | pnpm workspaces plus Turborepo | Hearth Stage must import the same packages the web app uses. A monorepo is a Phase 2 requirement, not a preference. |
| Web and API | Next.js App Router, server actions plus a versioned REST surface | One deployable, fast to build, good defaults. REST exists for the public API (R20.1) and the Stage sync client. |
| Platform | **Supabase** | Postgres, auth, and object storage from one vendor, built around row-level security, which is the model we already committed to. See section "Supabase" below. |
| Database | PostgreSQL | Row-level security is the tenant isolation mechanism. This is the one item on the list that is not negotiable. |
| ORM | Drizzle | Explicit SQL, predictable query shapes, and it does not fight RLS. |
| Jobs | Durable queue | Imports, statement generation, bulk sends, and offline reconciliation are long running and must survive a deploy. |
| Files | S3-compatible object storage, per-tenant key prefixes, hard quotas | Cost control. See PRD section 5.3. |
| Payments | Stripe Connect, application fee zero | See PRD section 5.1. |
| Email and SMS | Church-supplied Resend, SMTP, and Twilio credentials | See PRD section 5.2. |
| Front end | Tailwind CSS v4, shadcn/ui on Radix, Lucide, Motion | See [design-system.md](design-system.md). |
| Member app | PWA | Native apps are an explicit non-goal in v1. |
| Presenter | Electron plus shared core, SQLite cache | See [stage-architecture.md](stage-architecture.md). |
| Licence | AGPL-3.0 | Makes the pricing a property of the licence, not a promise. |

## Packages

```
apps/
  web            Next.js: admin UI, member portal PWA, REST API, server actions
  worker         Job queue consumer: imports, statements, sends, reconciliation
  stage          Phase 2: Electron presenter
packages/
  db             Drizzle schema, migrations, RLS policies
  ui             Design tokens, components, the /design gallery
  songs          Song model, section and sequence resolution, ChordPro transposition
  core           Shared domain logic, permissions, validation
  sync           Stage sync client and server contract
```

`packages/songs` is the reason this is a monorepo. Phase 1 and Phase 2 resolve arrangement sequences
and transpose charts with the same code, so a slide in Stage and a chart in the music stand view can
never disagree.

## Supabase

The platform decision, closed in [PRD section 13.9](../PRD.md). Postgres, auth, and storage from one
vendor, chosen because Supabase is built around row-level security and RLS is already our tenant
isolation boundary. Four integrations become one, which matters when one person maintains all of them.

### How we use it

- **Drizzle against the Postgres connection directly.** We do **not** use the auto-generated PostgREST
  API. Field-level permissions must be enforced in our own query layer (R1.5, R21.2), and our public
  API is a designed surface (R20.1) rather than a database projection.
- **Supabase Auth for authentication, our own tables for authorization.** Auth gives us magic links
  for members (R17.1), TOTP MFA (R1.8), and Google SSO (R1.9), all of which are weeks of work to get
  right and dangerous to get subtly wrong. Roles, scoping, and field-level rules stay ours.
- **Supabase Storage** with per-tenant key prefixes and enforced quotas.
- **Realtime is not used in v1.** The station's offline design is a local event log, not a live
  subscription. Adding a socket dependency to the one screen that must work without a network would be
  backwards.

### Enabled, not forced

Row-level security is **enabled** on every tenant-scoped table and deliberately **not forced**.

`FORCE ROW LEVEL SECURITY` binds the table owner as well, and the owner is the role that runs
migrations, seeds, exports, and genuinely cross-tenant platform jobs. Forcing it would make those
impossible and push the work into a `BYPASSRLS` role instead, which is strictly worse: it swaps a
narrow, auditable exception for a blanket one.

**Both connections go through the Supabase pooler.** `db.<project-ref>.supabase.co` publishes an
AAAA record and no A record, so on a network without IPv6 it fails as `ENOTFOUND`, which reads like a
mistyped hostname rather than like a routing problem. The pooler hostname carries the region and the
username carries the project ref: `postgresql://<role>.<ref>@aws-0-<region>.pooler.supabase.com:5432`.
Session mode, port 5432, because migrations take advisory locks. The client warns once if it is
pointed at the direct host.

Exactly three operations run before a tenant context exists, because they cannot do otherwise, and
each is named in the code:

| Operation | Why it has no context |
|---|---|
| `resolveTenantBySlug` | You cannot set a tenant context before you know which tenant it is |
| `membershipsForUser` | The question is inherently cross-tenant: which churches is this person in |
| `createChurch` | The tenant does not exist until the first statement of the transaction |

The first two only read. `createChurch` writes, and the shape of it is the safety: nothing it does
can touch a church that already exists. It inserts a tenant, a campus, the caller's own `app_users`
row, and one membership naming the caller. There is no input that redirects it at someone else's
data. It is also the only path in the product that grants a membership without an invitation, which
is why it refuses an unverified email address.

The guarantee we ship is about `hearth_app`, because `hearth_app` is what reaches a church's data. It
is not the owner, it owns no table, and it is `NOBYPASSRLS`. All three are asserted by the test
suite, and a further test asserts that the owner connection is never imported by the web app, so the
rule is a build failure rather than a review habit.

Some work inside `@connectapp/db` runs on the owner during a request, and it is worth naming rather
than leaving to be discovered: working out which church an address belongs to before anybody has
signed in, a church's own public pages, an account row, which belongs to a person rather than to a
church, and platform-wide work. Each of those happens before or outside a tenant context, so there is
no `app.tenant_id` for a policy to read and nothing for RLS to apply. What keeps them safe is not the
connection but the query: every one names the rows it may touch and filters to them itself, and none
takes a tenant from the caller. The boundary that is enforced mechanically is the import, which is
why the test is written against the web app rather than against this package.

### The connection rule

This is the detail that decides whether RLS actually protects anything.

The request path connects as a Postgres role that **RLS applies to**, and sets the tenant per
transaction:

```sql
set local app.tenant_id = '<tenant uuid>';
```

RLS policies read `current_setting('app.tenant_id')`. A query that forgets its tenant filter returns
nothing, rather than returning another church's members.

The third argument to `set_config` is `true`, meaning transaction-local. That is the whole safety
property on a pooled connection: without it, one church's context would survive into the next
request on the same connection. Removing it would be a silent cross-tenant bug rather than an error.

`withTenant` uses **Drizzle's own transaction API** rather than passing a postgres.js transaction
handle into `drizzle()`. Drizzle installs date parser overrides on `client.options` at construction,
and a postgres.js transaction handle carries no `options`, so constructing per transaction both
repeats that work and throws. The Drizzle instance is therefore built once from the pooled client and
`db.transaction()` supplies the per-request scope.

**The service role key never appears in a request path.** It is used only by the job worker, only for
operations that are genuinely cross-tenant, such as scheduled exports and platform metrics. A service
role connection bypasses RLS, which is precisely why it is confined to one process and audited.

### Confidential notes: three layers

R6.2 requires that a user without the confidential tier sees a note **exists**, with its date and
author, and cannot read its content through the UI, the API, an export, or a report. Three
independent mechanisms, so no single mistake exposes anything:

1. **Encryption.** The body is AES-256-GCM encrypted with a key held in the application environment,
   never in the database. A database dump does not contain readable pastoral notes.
2. **Projection.** The repository omits the `body` key entirely for roles that may not read it,
   rather than setting it to null or an empty string, so a consumer that forgets to check renders
   nothing instead of leaking a blank.
3. **Audit on read.** Every confidential read writes an audit entry naming the reader, so the
   boundary is observable rather than merely asserted.

The audit trigger is attached to every table that carries a `tenant_id`, found by querying the
catalogue rather than from a list in the migration. A list is a thing somebody forgets to add to, and
an unaudited table is indistinguishable from an audited one until the day someone asks who changed a
record. A test asserts the coverage.

The audit trigger strips `body` and `body_encrypted` before writing, because the log is read by more
people than the note is.

### Cost line to watch

Supabase Auth prices on monthly active users, the only cost in the stack that scales with **member**
count rather than church count. Free tier covers the pilot phase, Pro is $25 a month with 100,000 MAU,
which covers several hundred churches at our segment size. Tracked under N10.

If MAU ever becomes the dominant cost line, the exit is a self-hosted auth library on the same
Postgres. Contained, because authorization was never Supabase's job.

### No data-layer lock-in

It is Postgres. If Supabase becomes the wrong answer, the exit is `pg_dump`. Section 5.5 of the PRD
promises churches an exit, and we hold ourselves to the same standard.

## Tenancy

Every table carries `tenant_id`. **Postgres row-level security policies are the enforcement
boundary.** The application connects as a role that cannot bypass RLS, and the tenant is set per
request via a session variable.

Application-layer filtering is a convenience, never a control. A missing `where tenant_id = ?` must be
a query that returns nothing, not a query that returns another church's members.

Campus and location columns exist from the first migration even though v1 exposes a single campus.
Adding a tenancy dimension later is the one refactor that touches every query, so it is paid for
up front (R1.2).

**Verification (R1.3):** an adversarial test suite attempts cross-tenant reads and writes on every
table, through both the ORM and raw SQL as the application role. Every attempt must fail. This test
runs in CI and is a release gate.

## Permissions

Two layers, and both are enforced server side.

**Role level.** Owner, Admin, Staff, Finance, Pastoral, Group Leader, Team Leader, Check-in Volunteer,
Member. Group Leader and Team Leader are scoped: they see only their own group or team, with no giving
data and no confidential notes (R9.3).

**Field level (R1.5, R21.2).** Enforced at the query layer, not the view layer. A Staff-role query for
a donation returns the record with the amount field **absent**, not null and not zero. Confidential
pastoral notes are a separate permission tier from general pastoral access, are encrypted at the
application level with a distinct key, and **every read is audited** (R6.2).

If data is hidden only by the template, it is not hidden. Assume every consumer is the API.

## Audit log

Append only. No application role can update or delete an entry, including Owner. Records actor,
action, entity, before and after values, timestamp, and IP. Covers every write to people, giving,
notes, permissions, and check-in, and every **read** of a confidential note or a giving record.

## The admin portal

`apps/admin` is the platform's own portal, deployed separately from the product and never reachable
with a church's session. It approves a new church, takes one out of service, looks up which churches
an address can sign in to, and keeps the operators themselves. Its reads cross every tenant, so they
run on the owner connection behind a check that the asking account holds a live row in
`platform_admins`; that check is the first statement of every function in `repo/platform.ts`.

`platform_events` is append only, the same rule as a church's own audit log, and carries the note the
operator typed. Archiving writes `tenants.archived_at`, which `membershipsForUser`,
`verifyMembership`, the slug resolver and the self-sign-up lookup all filter on, so an archived
church cannot be signed in to or found.

**The first operator** is granted from a terminal that already holds the production database URL,
because before there is one there is nobody to press the button:

```
pnpm --filter @connectapp/db platform:admin grant you@example.org "Your Name"
```

The account has to exist first: sign up in the product with that address, then grant it. Everything
after that happens inside the portal, under Operators. `platform:admin list` and
`platform:admin revoke <email>` are the way back in if the last operator is ever lost.

## Offline check-in

The check-in station is the only place where offline is a hard requirement, so it gets a deliberate
design rather than a general purpose sync framework. The design case is two minutes before a service, forty
families queuing, the wifi down, and a volunteer who has done this twice.

**Before the service.** The station pulls the directory, the room configuration, the medical notes
and the authorised pickup lists into IndexedDB (R8.20). It pulls again on claiming a station, on
choosing a service, and after every reconciliation, so a tablet standing in the lobby at 09:40 is
already holding everything it needs.

**Security code ranges.** Each station is issued a block of codes on sync, written to
`checkin_codes` before anybody needs them (R8.6, R8.21). Every code in a block is spoken for: no
other station is given it, and `freeCode` on the online path will not generate it either. A station
holds 150, which is more children than one station checks in at a service.

**The same rules on both sides.** `@connectapp/db/rules` is a pure entry point with no database and no
node built-ins: the lookup ranking, the age and room rules, the code alphabet, and the release
decision. The station runs that code, and the SQL in `lookup.ts` is written to agree with it. A test
runs both against the same church and compares the answers.

**Event log.** Check-in and checkout are written to an append-only IndexedDB log, each with an id
the station generates before the event happens. Replay is idempotent on that id, so a log sent twice
checks nobody in twice (R8.23).

**Conflict handling.** Replay conflicts, for example the same child checked in at two stations, are
surfaced to a human. **Nothing auto-merges a child's location.** A wrong automatic answer here is
worse than an alert.

**Printing.** The desk writes the label pair into local storage and opens the labels window at
`?local=1`, which renders from what the station holds and asks the server for nothing (R8.24).

**The screen survives the network.** A service worker scoped to `/checkin` serves the station shell
network first and cache second, so a reload or a tablet waking up gets the station rather than the
browser's error page. It handles GET only: a check-in is a POST, and a POST answered from a cache
would be a check-in that never happened.

**Connection state is always visible.** The bar says there is no network, how many check-ins are
waiting on the tablet, and when they have gone (R8.22).

## Hearth Stage sync contract

Stage holds its own song library and presents without us. When a church pairs it, Stage is a client
of a versioned sync API, and the records it pulls are read-only on the laptop, so each record has
one writer.

**Pulls:** plans, plan items, songs, song sections, arrangements, arrangement media, and resolved
scripture text.

**Pushes:** `SongUsage` rows, which feed the usage history and the CCLI export (R12.9, R12.10, S17),
and a song the operator chooses to promote out of Stage's own library into the church's.

That is the entire contract. It is why R11.14 and R12.13 are Phase 1 requirements rather than Phase 2
work: the shape of the data Stage needs is settled before Stage exists, so Stage never needs an import
step. Deleting the import step is the whole product idea.

Written out in full, with routes, payloads, the cursor model, the device principal's scope, and the
six things 0.4 owes it: [stage-sync-contract.md](stage-sync-contract.md).

**Stage also runs unpaired**, with a song library of its own, which is how it reaches churches that do
not use the platform. Pairing adds a second source of songs and the plans, and `connectapp` records are
read-only in Stage so there is one writer per record. See
[stage-architecture.md](stage-architecture.md).

## Payments

Stripe Connect, church-owned account, **application fee fixed at zero**. Money moves giver to church
Stripe account to church bank, and never through an account we control.

**PCI scope is SAQ-A and stays there.** Stripe-hosted elements exclusively. Any change that would put
cardholder data into a request path we control is prohibited, whatever it would enable (R21.9).

## Credentials for church-supplied providers

Resend keys, SMTP passwords, and Twilio tokens are encrypted at rest with a key separate from the
database encryption key, are never logged, and are **never returned by the API or the UI after
saving**, only replaced (R21.15). The setup wizard verifies a connection and sends a test message
before it saves anything (R16.1).

## Reliability

**The service window is the availability target that matters.** 99.9% or better between 07:00 and 14:00
local time on a church's service days, measured and reported separately from overall uptime (N1). A monthly uptime
figure hides the only outage a church will ever notice.

- **No deploys inside a service window.** Enforced by tooling, not by memory (N5).
- **Zero-downtime migrations.** A church cannot be told the database is upgrading on a Saturday night
  (N9).
- **Daily backups with point-in-time recovery**, and a **restore drill run and documented quarterly**
  (R21.6). An untested backup is not a backup. The runbook, the census tool the drill uses, and the
  drill log are in [backup-and-restore.md](backup-and-restore.md).

## Performance targets

| Operation | Target |
|---|---|
| Check-in family lookup | Under 1s at 5,000 people |
| Person search | Under 300ms |
| Any page interactive | Under 2.5s on a mid-range Android phone over 4G |
| Person timeline | Under 1s for ten years of history |
| Full tenant export | Under 10 minutes at 5,000 people |
| Scale without per-church tuning | 5,000 people, 250,000 giving records |

Volunteers are on church wifi and their own phones, not a desk with fibre. N3 is written for them.

## Cost control

Infrastructure cost per church per month is tracked, because PRD section 5.6 gates growth on the
donation coverage ratio and you cannot gate on a number you do not measure (N10).

The cost bombs in a donation-funded platform are messaging and media storage, and both are
architecturally closed off: messaging runs on the church's own credentials, and storage is capped per
tenant with transcoding on upload and no video hosting.

## The name, and what kept the old one

The product is **ConnectApp**, at **connectapp.church**. It was called Hearth until October 2026 and
the rename went through the code, the copy and every document. **Hearth Stage** keeps its name: it is
a separate product in a separate repository.

Three things in Postgres still say `hearth`, on purpose:

- the login role `hearth_app`, which the application's connection string names
- the schema `hearth`, which holds `user_in_church` and `church_takes_files`
- the slug functions `hearth_free_member_slug`, `hearth_free_report_slug` and `hearth_free_person_slug`

Every RLS policy on every table calls into that schema, and the role carries a password that the
connection string and the deploy environment both hold. Renaming them is a migration that rewrites
every policy plus a credential rotation, which is a different job from renaming a product, and it
buys a church nothing. They are internal names no user ever reads.

## Sitting inside a church's own website

The redesign draws the member's screens as a panel on the church's site, at `gracefellowship.org/my-account`.
Two of the three pieces are built as the design draws them and one cannot be.

- **The group finder frames.** `/g/<church>/embed` is the finder with no chrome, and Settings, Church
  hands a church the `<iframe>` snippet. It carries no session, so it works in anybody's page.
- **The member's door is a link.** Settings, Church gives a church the My account address, which is
  the join link: it signs somebody in or signs them up and puts them in the church.
- **A signed-in panel cannot be framed.** A session inside somebody else's page is a third-party
  cookie, and Safari blocks those outright while Chrome is removing them. A framed sign-in works
  until it quietly does not, which is worse than a link.
- **So the signed-in screens take the church's own address instead.** A church sets a domain in
  Settings, Church and points it here with a CNAME. `tenants.custom_domain` holds it, one church a
  host, and `requireSession` resolves the church from the `Host` header when the request carries no
  `church` parameter. The cookie is then first-party and nothing is being worked around. An address
  in the request still wins, because a link somebody was sent names its church on purpose.

  Trying it locally: put `127.0.0.1 members.yourchurch.test` in `/etc/hosts`, set that domain on a
  church, and open `http://members.yourchurch.test:4488/home`. In production the deployment needs a
  wildcard certificate or a certificate a host, which is the part that is infrastructure.
