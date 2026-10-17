# Roadmap

What each area of ConnectApp is for, where it stands, and what it has to satisfy before a church
depends on it.

This document describes areas and their release criteria. It carries no delivery dates, because
there are none to promise. [BACKLOG.md](BACKLOG.md) is the authority on what is being built next, and
every story referenced here is a row in it. Requirement IDs refer to [PRD.md](PRD.md).

Status words used below:

| Word | Meaning |
|---|---|
| **Implemented and verified** | Built, and tested by a person |
| **Implemented, needs validation** | Built, and not yet proved against a real church, a real provider or a real account |
| **In development** | Being worked on now |
| **Planned** | On the board, not started |
| **Deferred** | Deliberately set down, and built only when asked for by name |

## 1. Current development status

The platform is substantially built and used internally. **No church is running on it.** That single
fact sets every criterion below: the next milestone is not a feature, it is the first pilot church
completing real services.

Of 397 stories on the board, 227 are Closed, 80 are Resolved and waiting to be tested by a person,
37 are New, and 14 are deferred.

What is built sits in two groups. Everything a church needs to keep its records and run a service
day is implemented and verified. Everything that depends on an outside account, meaning giving,
email sending, and a published website on a church's own domain, is implemented and needs validation
against that outside account.

What is not built: SMS, TOTP multi-factor, DSAR handling, a public REST API for churches, and the
children's ministry paperwork.

## 2. Church onboarding

**Implemented and verified.**

Sign-up, email verification, church creation, and a provisional period: a new church is held
provisional until a person has looked at it, with a 25-member cap and an invitation gate while it
waits. Approval happens in the administration portal. The setup guide then travels with the church
across every screen, naming the control to press on each one, deriving its progress from the
church's own records, and letting a step be skipped or the whole guide be put away and brought back.

Release criteria:

- A church signs up, is approved, and reaches a usable directory inside sixty minutes, measured in
  the product rather than estimated (R22.3).
- The setup guide's walk is re-verified in a browser whenever a flow it names gains or loses a step.
- The provisional cap and the invitation gate hold against a church that tries to grow past them.

Requirements: R22.1 to R22.3, R22.7, R22.8, R1.4, R1.7. Stories: HRT-105 to HRT-108, HRT-115,
HRT-213, HRT-367.

## 3. People and households

**Implemented and verified.**

Individuals, households, relationships, milestones, tags, custom fields, duplicate detection and
merge, archive and restore, saved lists, a member-facing directory with per-field privacy controlled
by the member, printable directories and labels, CSV and Excel import with a dry run and a rollback
window, importers for Planning Center, Breeze and ChurchTrac in their own export formats, and
complete export.

Release criteria:

- An adversarial suite attempts cross-tenant reads and writes on every table, through both the ORM
  and raw SQL, and every attempt fails.
- Field-level permissions are enforced at the query layer, verified by test rather than by reading a
  template.
- A merge is reversible for 30 days and an import is rollback-able for 30 days.
- Export is complete, ungated, and needs no support ticket.

Requirements: R2.x, R19.1 to R19.8, R1.x. Stories: F1, F2, F19 and F3 on the board.

## 4. Attendance and children's check-in

**Attendance: implemented and verified. Check-in: implemented, needs pilot validation.**

Attendance by headcount or by individual, visitor flagging, and absence detection. Children's
check-in with matching label pairs carrying unique per-visit codes, authorized pickup enforced at
checkout, allergies shown on screen at the moment of check-in, room ratios, a supervisor floor view,
room rosters, incident reports, and continued operation with no network.

This is the one safety-critical area in the product. A defect here can cause physical harm to a
child, so no R8 requirement is weakened for implementation convenience.

Release criteria:

- Three pilot churches complete four consecutive service days of children's check-in with zero
  safety incidents.
- At least one of those days includes a deliberate network failure, and check-in continues through
  it and reconciles afterwards.
- A label pair cannot be produced without a matching code, and a checkout cannot complete for an
  unauthorized person.
- The station screen holds 7:1 contrast and 56px targets throughout.

Acceptance detail is in [docs/checkin-acceptance.md](docs/checkin-acceptance.md).

Requirements: R7.x, R8.x. Stories: F7, F8.

## 5. Groups and volunteers

**Implemented and verified.**

Groups with types, participation, leader-scoped access, attendance taken on a phone, and a public
group finder where a request goes to the leader for approval rather than adding the person
immediately. Serving teams, scheduling with conflict detection, blockout dates, accept and decline
without signing in, substitute swaps, a background check gate, and a coverage gap view.

Release criteria:

- A group leader sees their own group and nothing else in the church.
- A volunteer accepts or declines from an emailed link with no account.
- Scheduling refuses a double-booking rather than recording one.
- A background check requirement blocks assignment where the role demands it.

Requirements: R9.1 to R9.11, R10.x, R11.x. Stories: F9, F10.

## 6. Service planning

**Implemented and verified.**

Service plans with ordered items, a live running total, notes per position, attachments, templates,
a live mode, and a print view. Services sit on the calendar, and the calendar carries room and
resource booking with conflict detection and facility use approvals.

A church does not only meet on Sunday, and nothing in this area assumes a weekday.

Release criteria:

- One pilot church plans and staffs four consecutive services entirely in ConnectApp.
- A plan's running time is correct against the items on it, and the print view matches the screen.
- A room cannot be double-booked.

The song library (R12.x) is **deferred** here and is not part of this area. See section 14.

Requirements: R11.x, R15.x. Stories: F11, F15.

## 7. Website builder

**Implemented, needs validation.**

A church builds and publishes its own website: a structured document model, a visual builder, a
section library, reusable layouts, palettes and fonts, media, revisions, autosave, preview,
publishing, starter content, and connection of the church's own domain with DNS guidance.

The earlier scope, a single bounded church homepage, has been superseded by what shipped. The
settled non-goal that remains is a general-purpose site builder for anything other than a church's
own site.

Release criteria:

- A church with no web experience publishes a site carrying its service times, location and contact
  details, without help.
- A published site is accessible and legible on a phone, and scores against the same WCAG 2.2 AA
  floor as the product.
- A custom domain verifies, serves over TLS, and the guidance in the product matches what the
  registrar actually asks for.
- A revision can be restored.

See [docs/website-builder.md](docs/website-builder.md). Requirements: R23.x. Stories: HRT-285 and the
Website Builder 2.0 section of the board.

## 8. Messaging

**Email: implemented, needs validation with a church's own provider. SMS: planned.**

The deferral was lifted on 12 October 2026. A church connects its own Resend account or SMTP server,
composes email, targets recipients from its own lists and groups, sends through a durable queue, and
sees delivery status, bounces and consent. Templates are stored and reusable. In-app messages work
with no provider at all.

ConnectApp never resells messaging credits. The shared email quota is transactional only.

SMS waits on a Twilio subaccount decision that has to be made outside this repository (HRT-286).
Group messaging (HRT-87) and serving reminders (HRT-126) wait on a church having a provider
connected.

Release criteria:

- A church connects its own provider and a real message reaches a real inbox, verified by reading
  the message rather than by reasoning that it must have worked.
- A bounce marks the address and stops further sending to it.
- Consent is respected on every send path, with no way to send to somebody who has opted out.
- The queue survives a restart without losing or duplicating a send.

See [docs/messaging.md](docs/messaging.md),
[docs/messaging-architecture.md](docs/messaging-architecture.md) and
[docs/messaging-setup.md](docs/messaging-setup.md). Requirements: R16.x, R17.1. Stories: F16,
HRT-286, HRT-287.

## 9. Giving

**Implemented, needs validation against a real Stripe account.**

The deferral was lifted on 12 October 2026 and release 0.3 shipped this area. Stripe Connect
onboarding, online one-time and recurring giving, funds with restricted designations, campaigns and
pledges, cash and cheque batch entry with dual control, non-cash gifts, payouts, deposit slips,
year-end statements, a giving QR code, and the lapsed donor report.

The constraint behind all of it does not move: the money runs on Stripe Connect against the church's
own account, the platform application fee is **zero**, we are not a money transmitter, PCI scope
stays SAQ-A, and card data never enters a request path we control.

Release criteria:

- One pilot church issues year-end statements from real data, and a CPA reviews a sample against IRS
  Publication 1771 before release.
- A gift reaches the church's own Stripe balance with a zero application fee, confirmed in Stripe.
- Batch entry under dual control cannot be completed by one person.
- A refund, a failed payment and a disputed payment each leave the records correct.

See [docs/giving.md](docs/giving.md). Requirements: R13.x, R19.6, R21.9. Stories: E3 on the board.

## 10. Events and forms

**Implemented and verified.**

Events with registration, waitlists, family sign-up, discount codes, a public preview and a roster.
Forms with conditional logic, file uploads, submissions and validation.

Release criteria:

- A member registers a whole family in one pass, on a phone.
- A full event waitlists rather than overbooks, and promotes correctly when a place opens.
- A form submission is attributed to the right person, or captured without one where the form is
  public.

Requirements: R4.x, R14.x. Stories: F4, F14.

## 11. Member portal

**Implemented and verified.**

An installable progressive web app for members: their own profile and household, their groups, events
they can register for, giving and statements, serving requests they can accept or decline, and
account settings. Notifications are delivered by push where the member has turned them on.

Release criteria:

- A member completes each of giving, joining a group, accepting a serving request and updating a
  detail on a phone, in under a minute each.
- Per-field privacy set by the member is respected everywhere the directory is read, including in
  print.
- The portal installs and opens offline to something useful.

Requirements: R17.x. Stories: F17.

## 12. Security and reliability

**Implemented, with named gaps.**

Tenant isolation is enforced by PostgreSQL row-level security on every table, never by application
filtering. Authorization is enforced at the query layer. The audit log is append only and cannot be
modified by any application role, including the church's owner. Confidential pastoral notes carry
application-level encryption. Development and production are separate Supabase projects, Stripe
accounts and Resend keys, with a guard that refuses to start a non-production process holding a
production credential. Backups have a written restore runbook and a quarterly drill.

Gaps, each on the board: TOTP multi-factor is deferred (HRT-13), and DSAR handling is planned.

Release criteria:

- The adversarial cross-tenant suite passes as a release gate on every change.
- A restore drill completes within the stated window, with a census taken before and after and
  compared row for row.
- No deploy lands inside a church's service window, 07:00 to 14:00 local on its own service days.
- Every migration is zero-downtime.

See [SECURITY.md](SECURITY.md) and
[docs/backup-and-restore.md](docs/backup-and-restore.md). Requirements: R21.x, R1.8.

## 13. Pilot validation

**The next milestone, and the one that matters.**

Everything above is software that works in our hands. Pilot validation is the only thing that turns
that into software a church can rely on, and children's check-in cannot be signed off any other way.

What a pilot needs:

- Three churches, at least one willing to run children's check-in on a pre-1.0 product.
- Four consecutive service days per church, with a person from ConnectApp reachable throughout.
- One deliberate network failure during a check-in, planned with the church.
- Real giving through a real Stripe account, and a real send through the church's own email provider.
- A written record of every defect and every moment a volunteer had to ask what to do.

Exit: zero safety incidents, and a volunteer who completes check-in without help on the fourth day.

Being a pilot church is the single most useful contribution anybody can make right now. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## 14. Hearth Stage

**A separately scoped project, in its own repository.**

Hearth Stage is an Electron desktop presenter for macOS, Windows and Linux, built on its own board
with its own releases labelled S0.1 to S1.0 so they are never confused with the platform's. It holds
its own song library and its own importers, and it presents a service for a church that has never
heard of ConnectApp.

**This repository owes Stage nothing right now.** The song library (R12.x), the song schema and
`/api/stage/v1` are deferred here, and no Stage functionality is built in this repository. The
specification stays: [PRD-STAGE.md](PRD-STAGE.md), [BACKLOG-STAGE.md](BACKLOG-STAGE.md),
[docs/stage-architecture.md](docs/stage-architecture.md) and
[docs/stage-sync-contract.md](docs/stage-sync-contract.md).

If pairing is taken up later, the shape in PRD section 9.4 still holds: lyrics as ordered labeled
sections rather than a blob, arrangement sequences as data, translations section-aligned. It would be
additive on both sides, and it is not scheduled.

## 15. General availability criteria

GA means a church can replace its existing ChMS entirely. It is not a feature count.

Before ConnectApp is offered publicly:

1. **Pilot validation complete.** Section 13, including the check-in exit criteria.
2. **Every area in sections 2 to 11 at "implemented and verified"**, with the outside-account areas
   proved against real accounts.
3. **The named gaps closed or consciously accepted:** multi-factor, DSAR handling, and SMS each
   either shipped or recorded as a known limitation on a public page.
4. **Accessibility audited** to WCAG 2.2 AA across the product, with the station screens at 7:1.
5. **Operational readiness:** a restore drill passed within the quarter, health checks green, the
   job queue draining, and a written wind-down commitment published.
6. **Support that a donation-funded platform can carry:** self-serve onboarding and migration good
   enough that a church does not need us, and a community forum for when it does.
7. **Retention and funding measured rather than assumed:** churches migrated off a paid product,
   twelve-week retention, and the donation coverage ratio, each reported as a real number.

Nothing here is a date. The board moves one story at a time, and the first church decides the rest.
