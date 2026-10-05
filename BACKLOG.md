# Backlog

The board. Every piece of work has an ID, a state, and an owner of the next move.

Requirement IDs (`R2.3`, `R8.21`) point at [PRD.md](PRD.md) and say **what** to build. Work item IDs
(`HRT-14`) say **when** it is being built and whether it is finished. One is the specification, the
other is the schedule. Neither replaces the other.

## How this works

Four levels, narrowest to widest:

| Level | Meaning | ID |
|---|---|---|
| **Epic** | A release. Defined by what a church can do with it. | `E1` to `E6` |
| **Feature** | A PRD domain inside that release. | `F1` to `F23` |
| **Story** | One deliverable. Built, then tested, then closed. | `HRT-n` |
| **Task** | Steps inside a story. Tracked in the story's checklist, not given IDs. |  |

A story is sized to be one sitting and one test. If it cannot be described in a sentence that starts
with a verb, it is too big and gets split.

### States

| State | Meaning | Who moves it next |
|---|---|---|
| **New** | Specified, not started. | Whoever picks it up |
| **Active** | Being built right now. Exactly one story is Active at a time. | The builder |
| **Resolved** | Built, verified by its own tests, waiting to be tested by a person. | **Boluwaji** |
| **Closed** | Tested and accepted. Done. | Nobody, it is finished |
| **Blocked** | Waiting on something external. The blocker is named in the row. | Whoever owns the blocker |
| **Deferred** | Deliberately pushed to a later release. The reason is named. | Reconsidered at release planning |

**Resolved is not Closed.** Nothing closes because the person who built it thinks it works. A story
sits in Resolved until it has been used by hand, which is the whole point of building one step at a
time. That gap between Resolved and Closed is the review.

### Rules

1. **One story Active at a time.** No parallel half-finished work.
2. **Every story names what to test.** A story with no test instruction cannot reach Resolved.
3. **Commits reference the story**, in the footer, one line: `Work item: HRT-14`.
4. **Nothing is built that has no story.** Scope creep is a new row, not a bigger row.
5. **The board is updated in the same commit as the work.** A stale board is worse than none.

---

## E1. Foundation (0.1)

Internal only. No church touches this. Exit criteria in [ROADMAP.md](ROADMAP.md).

### F24. Design system

| ID | Story | Req | State |
|---|---|---|---|
| HRT-1 | Platform-neutral tokens, generated to CSS, three density modes | R24.1 to R24.3, R24.7, R24.13 | Closed |
| HRT-2 | Colour spectrum, hues assigned to things rather than sprinkled | R24.4, R24.9 | Closed |
| HRT-3 | Component library, every state, both themes, all three densities | R24.6, R24.11, R24.12, R24.15, R24.17 | Closed |
| HRT-4 | The `/design` gallery, eight pages | R24.8, R24.16 | Closed |
| HRT-5 | Replace native browser validation with our own field messages | R24.6 | Closed |
| HRT-6 | Dark-mode status colours, and stop tinting invalid inputs | R24.5, R24.10 | Closed |
| HRT-113 | UI sweep: every screen against the design system, 58 findings | R24.6, R24.18 | Resolved |
| HRT-200 | Land the redesign handoff, reconcile its tokens against ours | R24.1, R24.4 | Resolved |
| HRT-201 | The shell: collapsible sidebar, a top bar with one action, bottom tabs on a phone | R24.6, R24.14 | Resolved |
| HRT-202 | Navigation scoped to the role, one sidebar per persona | R1.3, R24.6 | New |
| HRT-203 | The dashboard: setup checklist, reorderable tiles, attendance over time | R18.1, R22.1 | New |
| HRT-204 | People: the filter drawer, inline search, CSV export, pagination | R2.14, R19.4 | Resolved |
| HRT-205 | The command palette on Cmd+K, and no search box in the top bar | R24.6 | New |
| HRT-206 | Empty, first-run, loading and error states across every screen | R24.6, R24.11 | New |
| HRT-207 | Notifications: the bell, the unread count, a panel per role | R24.6 | Resolved |
| HRT-208 | The remaining screens against the redesign, one pass each | R24.6, R24.18 | Active |

The redesign that HRT-200 to HRT-208 carry out arrived as prototypes in October 2026. The
reconciliation, the token mapping, what is excluded and why, and the journeys held against what is
built are in [docs/redesign/README.md](docs/redesign/README.md). Giving, songs, the email mockups and
the multi-church overview are drawn in the design and are not being built. CLAUDE.md is the authority
and a design file does not move it.

### F1. Tenancy, roles and administration

| ID | Story | Req | State |
|---|---|---|---|
| HRT-7 | Supabase Postgres, 21 tables, row-level security on every one | R1.3, R21.1 | Closed |
| HRT-8 | Roles with field-level permissions enforced at the query layer | R1.4, R1.5, R21.2 | Closed |
| HRT-9 | Append-only audit log written by database trigger | R1.11, R21.5 | Closed |
| HRT-10 | Adversarial isolation suite, cross-tenant reads and writes on every table | R1.3 | Closed |
| HRT-11 | Sign-in, membership-verified sessions, invitations | R1.7 | Closed |
| HRT-12 | Database hardening: pinned search paths, no PostgREST reachability | R21.3, R21.x | Closed |
| HRT-111 | Campus and location on the record and in the UI where it shows | R1.2 | Resolved |
| HRT-77 | Supabase advisors: the storage membership check off the REST API, covering indexes | R21.x | Closed |
| HRT-121 | Backups with point-in-time recovery, and a restore drill run and written down | R21.6 | Resolved |
| HRT-122 | The no-training commitment where a church can read it, and nothing in the pipeline that breaks it | R21.12 | Resolved |
| HRT-123 | Church-supplied provider credentials encrypted with their own key, never logged, never returned | R21.15 | New |
| HRT-13 | TOTP multi-factor, mandatory for Owner, Admin and Finance | R1.8, R21.4 | Deferred to later in 0.1, product surface first |
| HRT-14 | Active session list with remote revoke | R1.10 | Cut |
| HRT-15 | Church profile settings: name, address, timezone, service times | R1.1 | Closed |
| HRT-43 | Brand colour on the member-facing and printed surfaces | R1.1 | Resolved |
| HRT-45 | Settings behind the user's own name, with tabs for account, church, tags and fields | R22.x | Closed |
| HRT-109 | Creating an account, and a password somebody can set, change or recover | R1.7, R1.8, R22.1 | Resolved |
| HRT-110 | Saved lists, static and rule-based | R1.14 | Resolved |
| HRT-114 | Joining a church: its link and code, and claiming a person record | R1.7, R17.1, R22.1 | Resolved |
| HRT-115 | A new church is provisional until a human has looked at it | R1.1, R21.x | Resolved |
| HRT-32 | Create a church and its first Owner from sign-up. A church is a `tenants` row. | R1.1, R22.1 | Closed |
| HRT-16 | Custom field definitions and values, in the UI | R1.12 | Closed |
| HRT-17 | Tag management, assignment, and merge, in the UI | R1.13 | Closed |
| HRT-34 | Tags on households, once households have a page of their own | R1.13 | New |
| HRT-35 | Audit trigger on every tenant table, found by query rather than a list | R1.11 | Closed |
| HRT-18 | Storage quota, enforced at upload, with the church logo as its first user | R1.1, R1.16 | Closed |
| HRT-44 | Show usage against the quota, once a church can approach it | R1.16 | Deferred |
| HRT-36 | **Externalise every user-facing string.** | R22.8 | Closed |
| HRT-37 | CI: typecheck, the test suite, and the contrast and accessibility audit | R22.7, N7 | Closed |

### F2. People

| ID | Story | Req | State |
|---|---|---|---|
| HRT-19 | People and households, read-only directory | R2.1, R2.2 | Closed |
| HRT-20 | Notes in two classes, confidential ones encrypted and separately gated | R2.7 | Closed |
| HRT-21 | **Add, edit and archive a person. Households and contact methods.** | R2.1 to R2.3, R2.5, R2.13 | Closed |
| HRT-22 | Relationships, independent of household | R2.4 | Closed |
| HRT-23 | Milestones, with the extensible kind list | R2.6 | Closed |
| HRT-24 | Duplicate merge and review queue, reversible for 30 days | R2.8 | Closed |
| HRT-117 | A merge moves group memberships, pipeline entries and follow-ups | R2.8 | Resolved |
| HRT-118 | ~~Skills, interests and spiritual gifts as managed vocabularies~~ | R2.9 | **Cut** |
| HRT-210 | The status engine: a nightly pass, the thresholds as settings, and nothing it writes over a human | R2.16 | New |
| HRT-211 | Status history on a person, with who changed it and a one-press revert | R2.17 | New |
| HRT-212 | Staff as its own fact: flag, job title, start date, and a badge | R2.18 | New |
| HRT-119 | Search across names, emails, phones and addresses, under 300ms at 5,000 people | R2.14 | Resolved |
| HRT-120 | The person timeline: attendance, groups, notes and milestones in one order | R2.15 | Resolved |
| HRT-25 | Bulk edit across a selection: tag, status, archive | R2.12 | Closed |
| HRT-40 | Directory search, filtering, sorting and pagination | R2.1, R2.2 | Closed |
| HRT-42 | Date field and calendar of our own, replacing the browser's | R24.x | Closed |
| HRT-26 | Background check status and expiry tracking | R2.10, R21.11 | Resolved |
| HRT-27 | Birthdays and anniversaries list, by month and week | R2.11 | Resolved |

### F19. Data portability

| ID | Story | Req | State |
|---|---|---|---|
| HRT-28 | Import wizard: column mapping, dry run, duplicate handling | R19.1 to R19.3 | Closed |
| HRT-38 | Excel (.xlsx) files, as well as CSV | R19.1 | Closed |
| HRT-29 | Import rollback, reversible for 30 days | R19.4 | Closed |
| HRT-30 | Complete export of every entity, open formats, no gate | R19.8 | Closed |
| HRT-39 | Stream the export instead of building it in memory, once a church outgrows it | R19.8 | New |
| HRT-102 | Planning Center, Breeze and ChurchTrac people and households, their own export formats | R19.5 | Closed |
| HRT-116 | Group membership import, for the same three systems | R19.5, R9.5 | Closed |
| HRT-31 | Sample data set, with its loader and tests | R19.7 | Closed |
| HRT-46 | A demo experience: somewhere to see the product full without signing up | R19.7, R22.1 | Closed |
| HRT-71 | The demo keeps pace with the product: every new owner screen is filled in it | R19.7, R22.1 | Closed |
| HRT-72 | Build the demo church faster than a visitor will wait | R22.1 | Closed |
| HRT-33 | Seed and gallery names to US names, since US churches come first | R19.7 | Closed |

---

## E2. Services and check-in (0.2)

The first release real churches run. Attendance, check-in, groups and follow-up.

Renamed from "Sunday core". Church is a Tuesday hospital visit and a Thursday small group as much as
a Sunday service, and a release name that says otherwise shapes what gets built.

### F7. Attendance

| ID | Story | Req | State |
|---|---|---|---|
| HRT-47 | Services, repeating or one-off, with cancellation | R7.1 | Closed |
| HRT-68 | Repeats: a frequency and an end date, rather than weekly forever | R7.1 | Closed |
| HRT-69 | A month at a time, rather than every service ever | R7.1 | Closed |
| HRT-70 | Three views of a month: list, calendar grid and tiles | R7.1 | Closed |
| HRT-48 | Headcount-only attendance, with a note per occurrence | R7.2, R7.8 | Closed |
| HRT-49 | Individual attendance from a roster, backdated and corrected | R7.3, R7.7 | Closed |
| HRT-50 | First-time and second-time visitor flagging from attendance history | R7.5 | Closed |
| HRT-51 | Absence detection against a configurable threshold | R7.6 | Closed |
| HRT-52 | Attendance against groups and events | R7.4 | Folded into HRT-85 |
| HRT-53 | Trends: week over week, year over year, rolling average | R7.9 | Moved to HRT-66 |

### F8. Check-in, safety-critical

**No story here starts until its acceptance criteria are written and agreed.** A defect here can
cause physical harm to a child. The design case is 09:58 on a Sunday, forty families queuing, the
wifi down, and a volunteer who has done this twice.

The criteria are written: [docs/checkin-acceptance.md](docs/checkin-acceptance.md). Read them before
starting any story below. They are the definition of done, ahead of anything the story says.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-54 | Kids classes with age ranges, capacity and volunteer ratios | R8.14 to R8.16 | Closed |
| HRT-55 | Station configuration and the four station modes | R8.1, R8.2 | Closed |
| HRT-73 | A screen for the modes a family drives itself, rather than the volunteer's | R8.1, R24.14 | Closed |
| HRT-56 | Family lookup, and several children checked in together | R8.3 to R8.5 | Closed |
| HRT-57 | Matching label pair with a unique per-visit security code | R8.6, R8.11 | Closed |
| HRT-58 | Allergies and medical notes on the label and on screen | R8.10 | Closed |
| HRT-59 | Checkout: the code, the authorised pickup list, the custody block, the override | R8.7 to R8.9 | Closed |
| HRT-74 | The station opens on the service that is actually happening now | R8.2 | Closed |
| HRT-75 | Station search is a directory lookup, by person, on name prefixes | R8.3, R8.4 | Closed |
| HRT-78 | A station is three questions: a name, who drives it, what prints | R8.1, R8.2 | Closed |
| HRT-60 | The station keeps working with no network | R8.20 to R8.24 | Closed |
| HRT-61 | Label printing: Brother QL, Dymo, and plain paper | R8.25, R8.26 | Closed |
| HRT-112 | The bag or stroller label, an optional third print | R8.12 | Resolved |
| HRT-62 | Supervisor board and class rosters | R8.18, R8.19 | Resolved |
| HRT-63 | Incident reports, restricted and permanently retained | R8.13 | Resolved |

### F18. Insights, deferred to 1.0

Everything derived from the record, in one place: attendance trends, who is new, who has stopped
coming, growth and retention.

Two lists were briefly on the Services page and were wrong there twice over: they pushed the day's
work down the screen, and they were unbounded, so a church of two hundred got a wall. The queries
behind them are built and tested, and they sit in `@hearth/db` until there is a page for them.

**Deferred at release planning, 30 September 2026.** F18 is a 1.0 domain (E5 Reporting). It was
pulled forward to house those two lists, which is a reason to have somewhere to put them, and not a
reason to build a reporting surface before a church can run a Sunday. E2 exists so a church can take
attendance and check children in. Reporting on a record the church cannot yet keep is the wrong
order.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-64 | An Insights page: the shape, the navigation, and what belongs on it | R18.1 | Deferred to 1.0 |
| HRT-65 | Who is new, and who has stopped coming, as bounded lists that link into the directory | R18.4, R7.5, R7.6 | Deferred to 1.0 |
| HRT-66 | Attendance trends: week over week, year over year, rolling four-week average | R18.2, R7.9 | Deferred to 1.0 |
| HRT-67 | Growth and retention, and the first-time-visitor conversion funnel | R18.3 | Deferred to 1.0 |

HRT-65 gives the directory a filter driven by those queries, so Insights links into a list that
already searches, sorts, pages, selects, bulk tags and exports. None of that gets rebuilt when it
comes back.

### F9. Groups and discipleship

Where the church happens between Sundays. The hard part is not the roster, it is getting a leader to
record anything at all, so every leader-facing flow is a phone and under sixty seconds.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-83 | Groups: types, the record, leaders and the roster | R9.1 to R9.4 | Resolved |
| HRT-84 | A leader sees their own group and nothing else | R9.3 | Resolved |
| HRT-85 | Group attendance in under sixty seconds on a phone | R9.7, R7.4 | Resolved |
| HRT-86 | The group finder, join requests, and a leader approving them | R9.5, R9.6 | Resolved |
| HRT-87 | Messaging a group's roster through the church's own provider | R9.8 | New |
| HRT-88 | A picture on a group, with the storage quota behind it | R9.2, R5.3 | Resolved |
| HRT-89 | A public group page a church can link to without signing in | R9.5 | Resolved |
| HRT-90 | A group's own page: what it is, when it meets, who runs it | R9.2, R9.5 | Resolved |
| HRT-91 | One groups screen: the finder is the groups page | R9.1, R9.5 | Resolved |
| HRT-92 | The church's own email provider | R16.2 | Dropped |

Two things a church's existing finder does that ours does not yet. **HRT-88:** every group has a
picture, which is most of why a list of forty is readable at a glance. It needs the storage quota
and image transcoding behind it rather than a URL field. **HRT-89:** the finder is behind sign-in,
and a church links to its groups page from its website, so somebody who has never been needs to see
it. Both are real, and both are after the rest of F9.

### F5. Follow-up and assimilation (0.2)

| ID | Story | Req | State |
|---|---|---|---|
| HRT-93 | The six pipelines, their steps, and a person's follow-up | R5.1, R5.2, R5.4, R5.6 | Resolved |
| HRT-94 | Entering a pipeline on its own: first visit, second visit, three absences | R5.3 | Resolved |
| HRT-97 | Editing the six: names, steps, days, who they land on, off | R5.2 | Resolved |
| HRT-95 | My follow-ups: the queue, overdue first | R5.5 | Resolved |
| HRT-96 | The board: who is in each pipeline and what is late | R5.7 | Resolved |

No workflow engine. Six pipelines, written down, and a configurable builder deferred to 1.x where
the PRD puts it (R5.8). **HRT-97** is the middle ground: a church renames a pipeline, rewrites a
step, changes how many days it gets, says who it lands on, and switches one off. What it cannot do
is invent a seventh or draw a branch. That is the line, and it is the line that keeps this usable. The engine is the single feature that makes Rock RMS unusable by the person
this product is for.

### F3. The member-facing directory (0.2)

| ID | Story | Req | State |
|---|---|---|---|
| HRT-98 | The member directory inside the product | R3.1 | Dropped |
| HRT-99 | Per-field visibility chosen by the member, and whole-record opt out | R3.2, R3.3 | Resolved |
| HRT-100 | The printed directory, honouring every setting at generation | R3.5, R3.4 | Resolved |
| HRT-101 | The admin view that shows every field, permission gated | R3.6 | Closed, built in F2 |

**Decision, October 2026: there is no directory of the congregation inside the product.** It was
built (HRT-98) and taken out the same day. A search box over everybody's households is a search box
over everybody's households however carefully the fields are gated, and looking the church up is not
something a member does.

What survives is the consent model (HRT-99) and its one reader, the **printed** directory (HRT-100).
A church handing out a book it printed is a different act from a search box, and the fields in that
book are still the member's to decide: the default is their name, a child never appears with contact
details, and anybody can be absent from it entirely.

R3.1 and R3.6 as the PRD writes them are superseded by this. The staff directory (F2) is the only
directory on a screen.

### F21. Safeguarding and minors, deferred to the children's ministry pass

| ID | Story | Req | State |
|---|---|---|---|
| HRT-103 | Minors: no contact details in the member directory, restricted export, consent recorded | R21.10 | Deferred to 0.9 |
| HRT-104 | Safeguarding records retained permanently with access restricted, audited end to end | R21.11 | Deferred to 0.9 |

**HRT-104** is partly built: incident reports are permanent and restricted (HRT-63). What is missing
is background checks (HRT-26) and training records (F10) under the same retention and the same gate,
and a test that walks all three.

**Why these moved.** Check-in already enforces what keeps a child safe on the day: matching label
pairs with a per-visit code, authorised pickup at checkout, allergies on screen and on the label,
incident reports that cannot be edited, and the whole thing working with no network. Those shipped
in 0.2 and are not touched by this. What is deferred is the paperwork around them, which no church
needs before it can run the product. It is gathered into one children's ministry pass (0.9), ahead
of money and after everything else.

### F22. Onboarding (0.2)

| ID | Story | Req | State |
|---|---|---|---|
| HRT-105 | The setup wizard: church, services, roles, import. Resumable and skippable | R22.1 | Resolved |
| HRT-108 | Who can get in: the team, invitations, roles | R1.4, R1.7 | Resolved |
| HRT-106 | In-context help on every screen | R22.2 | Resolved |
| HRT-107 | Time to value under sixty minutes, measured in the product | R22.3 | Resolved |

R22.1 lists giving and messaging credentials as wizard steps. Giving is 0.3 and messaging is not a
screen a church fills in (HRT-92, dropped), so the 0.2 wizard is church details, service times,
roles and invitations, and the import.

## E7. Children's ministry, the paperwork pass (0.9)

Everything that keeps a child safe on the day shipped in 0.2: matching label pairs with a per-visit
code, authorised pickup enforced at checkout, allergies on screen and on the label, incident reports
that cannot be edited, and the station working with no network. None of that moves.

What is gathered here is the records around it, which a church can run the product without:
**HRT-103** minors in the printed directory, **HRT-104** retention and the audit that proves it,
**HRT-81** the two-adult-rule alert, **HRT-82** background-check gating on a children's position.
R8.17 belongs here too.

It runs second to last, after 1.0 and before money.

## E3. Money (0.3, built last)

F13 Giving. Stripe Connect at a zero platform fee, batch entry with dual control, IRS Publication
1771 statements, QuickBooks export.

## E4. Service Ops (0.4)

F10 volunteers, then F11 service planning. F12 the song library is deferred.

### F10. Serving and volunteers

A volunteer serves across ministries: the same person runs the sound desk, teaches a class one
week in three, and drives the van. So serving is a person's schedule across the church rather than
a list held by each ministry, and the check-in board reads from it rather than keeping its own.

**A team is not a group.** A group is people who meet: a small group, a class, a committee. A team
is people who serve on a schedule: worship, production, welcome, kids. The difference is what each one
needs. A group needs a roster and a record of whether it met. A team needs positions, a schedule
against specific services, accept and decline, blockout dates, substitutes, and a background check
before anybody is scheduled with children. Building a team as a group with extra columns would mean
a schedule screen pretending to be a roster screen.

Where they meet: a person is on a team and may also be in a group, and both show on their record.
The **Ministry team** group type stays for a church that wants a list of who is on the sound desk
and nothing more. Turning such a group into a team is not built: a church that wants a team makes
one and adds the people, which takes a minute and needs no migration screen.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-79 | Teams, positions, and a person serving across several of them | R10.1, R10.2 | Resolved |
| HRT-80 | The schedule plan: by service, blockout dates, how often, and where else somebody is | R10.3 to R10.5 | Resolved |
| HRT-124 | Accept and decline from a link, with no sign-in | R10.6 | Resolved |
| HRT-125 | ~~Substitute requests: the volunteer asks, the leader confirms~~ | R10.7 | **Cut** |
| HRT-126 | Reminders on publication, a week out and two days out, including the email that carries the answer link | R10.8 | Blocked on a messaging provider (R16.3) |
| HRT-81 | Who is serving in a kids class today, and the two-adult-rule alert on the board | R8.17, R10.12 | Deferred to 0.9 |
| HRT-82 | Background-check gating: no children's position without a valid check | R10.9 | Deferred to 0.9 |

### F11. Service planning

The order of service, which is the document a church actually runs a gathering from. It is one plan
per gathering, because two services on a day are two plans even where the order is the same.

Songs are deferred, so a song item is an item with a title. When F12 comes back, a song item points
at an arrangement and R11.4 lands on top of what is already here.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-127 | The plan: items in order, with types, durations, a running total and the end time | R11.1 to R11.3 | Resolved |
| HRT-128 | Notes on an item, and notes addressed to a team or a position | R11.6 | Resolved |
| HRT-129 | Attachments on an item: charts, PDFs, audio, images | R11.7 | Resolved |
| HRT-130 | Templates, and duplicating last week's plan without its content | R11.8 | Resolved |
| HRT-131 | Who serves, inline on the plan, writing through to the schedule | R11.9 | Resolved |
| HRT-132 | The printed order of service, full for the team and short for the bulletin | R11.10 | Resolved |
| HRT-133 | Live mode: current item, next item, elapsed against planned | R11.11 | Resolved |
| HRT-134 | Plan history: who changed what, and when | R11.12 | Resolved |
| HRT-135 | Scripture items with the reference, the translation and the resolved text | R11.5 | Blocked on HRT-198, the Bible lookup (R20.3) |
| HRT-136 | Song items carrying an arrangement, its key and its sequence | R11.4 | Deferred with the song library |

## E5. GA (1.0)

F4 Forms, F17 Portal, F6 Pastoral care, F15 Calendar, F14 Events, F18 Reporting, F20 API.

**F16 communication is deferred** and is not to be started again until it is asked for. HRT-87 group
messaging and HRT-126 serving reminders stay waiting on it.

**Anything that takes money is held back to 0.3.** Paid event registration, giving in the portal,
giving reports and the accounting export are listed here under the feature they belong to, each
marked for 0.3, so the shape of the feature is on the board while the money is built last.

### F16. Communication

**Deferred, October 2026.** Built and then taken out again at the church's instruction. Nothing in
this repo sends email, holds SMTP or Twilio credentials, or keeps a send queue, and nothing is to be
built here until it is asked for.

What was removed: the SMTP settings screen, the shared transactional allowance and its ledger, the
composer and template library, audience targeting, the send queue, and bounce handling. The tables
behind them were dropped in migration 0058.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-137 | The church's own email provider | R16.1, R21.15 | **Removed, deferred** |
| HRT-138 | The shared transactional quota | R16.3 | **Removed, deferred** |
| HRT-139 | The composer, merge fields and the template library | R16.4 | **Removed, deferred** |
| HRT-140 | Targeting a send | R16.5 | **Removed, deferred** |
| HRT-141 | The send queue | R16.6 | **Removed, deferred** |
| HRT-142 | Bounces and retries | R16.7 | **Removed, deferred** |
| HRT-143 | Consent and unsubscribe | R16.8 | Deferred |
| HRT-144 | The church's own Twilio, and opt-in before any SMS | R16.2, R16.8 | Deferred |
| HRT-145 | Inbound replies into a shared inbox | R16.9 | Deferred |
| HRT-146 | Mail-merge letters, Avery labels and envelopes | R16.12 | Deferred |
| HRT-147 | Birthday and anniversary sends | R16.13 | Deferred |

### F4. Forms

A form is how a church gets data in without typing it. The whole value is R4.4: a submission becomes
a person record or attaches to one, using the duplicate logic already built in F2.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-148 | The builder: every field type, section headers, required fields and validation | R4.1, R4.9 | Resolved |
| HRT-209 | The builder rebuilt to the redesign: tiles, inline questions, the preview beside them | R4.1, R24.6 | Resolved |
| HRT-149 | Conditional logic, showing and hiding fields on earlier answers | R4.2 | Resolved |
| HRT-150 | The public link and the snippet a church pastes into its own site | R4.3 | Resolved |
| HRT-151 | A submission matching a person or creating one, writing custom field answers through | R4.4 | Resolved |
| HRT-152 | The review queue, for a submission that matched more than one person | R4.5 | New |
| HRT-153 | Notification on submit, and a submission starting a pipeline | R4.6, R4.7 | New |
| HRT-154 | The prebuilt forms: connection card, prayer request, membership interest, volunteer application, child information, facility use | R4.8 | New |

### F17. Member and volunteer portal

The portal is the PWA a member installs. It is the same data behind a different door, so almost
every story here is a view over something already built.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-155 | Magic link sign-in, with a password as an option | R17.1 | New |
| HRT-156 | The installable PWA: offline shell, push notifications, and what a push is sent for | R17.11, R16.10 | New |
| HRT-157 | Profile and household self-service, honouring the privacy settings | R17.2, R17.3 | New |
| HRT-158 | My serving schedule, with accept, decline and blockout dates | R17.7 | New |
| HRT-159 | Browse groups, ask to join, see my groups | R17.5 | New |
| HRT-160 | Check my children in from my phone, generating the codes the station prints | R17.8 | New |
| HRT-161 | Submit a form or a prayer request, and the prayer wall for the ones marked public | R17.9, R17.10 | New |
| HRT-162 | The announcement feed | R16.11 | New |
| HRT-163 | Give, see my giving, manage a recurring gift, download a statement | R17.4 | Held to 0.3 with money |

### F6. Pastoral care

The confidential tier is the point. A pastoral note is not an admin note, and R6.2 says every read
is recorded, which the notes table already does.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-164 | The care log: dated interactions, type, participants, summary, follow-up date | R6.1 | New |
| HRT-165 | Confidential counselling notes on their own permission tier, every read audited | R6.2 | New |
| HRT-166 | Prayer requests, member submitted or staff entered, with privacy levels | R6.3 | New |
| HRT-167 | Hospital and home visits, with admission and discharge, and a visit roster | R6.4 | New |
| HRT-168 | Care teams, assignment, and who is carrying how much | R6.5 | New |
| HRT-169 | Benevolence requests, reportable in aggregate without naming anybody | R6.6 | New |
| HRT-170 | A follow-up set from a care interaction, surfacing in the same queue as the rest | R6.7 | New |

### F15. Calendar and facilities

| ID | Story | Req | State |
|---|---|---|---|
| HRT-171 | The master calendar: services, events, group meetings and bookings in one view | R15.1 | New |
| HRT-172 | The public calendar and its subscription feed | R15.2, R20.5 | New |
| HRT-173 | Rooms, resources and equipment, with capacity and attributes | R15.4 | New |
| HRT-174 | Booking with conflict detection, including setup and teardown buffers | R15.5 | New |
| HRT-175 | Facility use requests: the approval step, and what an outside group has to supply | R15.6, R15.7 | New |
| HRT-176 | Printed monthly and weekly calendars, and the room schedule for the building | R15.8 | New |

### F14. Events and registrations

| ID | Story | Req | State |
|---|---|---|---|
| HRT-177 | The event record and the public event page | R14.1, R14.2 | New |
| HRT-178 | Free registration, capacity, and a waitlist that promotes when a place frees | R14.4 | New |
| HRT-179 | Custom questions per registrant, reusing the form logic | R14.5 | New |
| HRT-180 | Family registration in one flow, several household members and one submission | R14.6 | New |
| HRT-181 | Recurring events and event series | R14.9 | New |
| HRT-182 | Event check-in through the same station, with badges and rosters | R14.10 | New |
| HRT-183 | Attendee export, printed roster, and the emergency contact sheet | R14.12 | New |
| HRT-184 | Paid registration, add-ons, discount codes and refunds | R14.3, R14.7, R14.8, R14.11 | Held to 0.3 with money |

### F18. Reporting and analytics

No custom report builder, ever. Around twenty canned reports that answer the questions a small
church actually asks.

| ID | Story | Req | State |
|---|---|---|---|
| HRT-185 | The dashboard: attendance, new people, coverage gaps, overdue follow-ups | R18.1 | New |
| HRT-186 | Attendance reports: trend, year over year, by service, by demographic | R18.2 | New |
| HRT-187 | The first-time visitor funnel, with conversion rates and elapsed time at each step | R18.3 | New |
| HRT-188 | Growth and retention: new, returning, lapsed, net change by month | R18.4 | New |
| HRT-189 | Group participation and group health | R18.6 | New |
| HRT-190 | Volunteer coverage, serving frequency, and expiring checks and certifications | R18.7 | New |
| HRT-191 | Milestone and demographic lists | R18.8 | New |
| HRT-192 | The connectedness indicator: four booleans and a count | R18.9 | New |
| HRT-193 | CSV and PDF on every report | R18.10 | New |
| HRT-194 | Giving reports: by fund, by period, lapsed donors, first-time givers, pledge progress | R18.5 | Held to 0.3 with money |

### F20. Integrations and API

| ID | Story | Req | State |
|---|---|---|---|
| HRT-195 | Scoped API keys, rate limits, and a record of what each key did | R20.1, R1.13 | New |
| HRT-196 | The REST API over people, households, groups, attendance, events and plans | R20.1 | New |
| HRT-197 | Outbound webhooks on the events worth hearing about | R20.2 | New |
| HRT-198 | Bible lookup for scripture in plans, with translations. Unblocks HRT-135 | R20.3 | New |
| HRT-199 | QuickBooks and generic accounting CSV export | R20.4 | Held to 0.3 with money |

## E6. Hearth Stage (P2)

The presenter, specified in [PRD-STAGE.md](PRD-STAGE.md) and tracked on its own board,
[BACKLOG-STAGE.md](BACKLOG-STAGE.md), with `STG-n` story IDs. It is built in parallel and has its own
Active story.

**Stage runs standalone**, with its own song library and its own importers, so the first three Stage
releases need nothing from this board. One Stage release, S0.4, pairs with the platform and closes the
loop from plan to stage to attendance.

**That pairing is deferred.** The sync contract in
[docs/stage-sync-contract.md](docs/stage-sync-contract.md) still describes what the platform would
owe Stage: the song schema (R12.x), plans readable as data (R11.14), `change_seq` on every synced
table, the Stage device principal with pairing and revoke, the routes under `/api/stage/v1`, and the
idempotent `song_usage` insert. None of it is scheduled, and none of it gets a story until somebody
asks. See the note below.

**One correction is owed here.** PRD.md section 9.6 says Stage is "a client of a versioned sync API,
not a second application with a second database". Stage holds a library of its own, so that line needs
replacing. The wording is in PRD-STAGE.md section 2.

---

## R10.7 was cut, October 2026

The substitute request was a second way of saying what a decline already says. Somebody who cannot
make it presses no; the slot empties and the leader sees it on the schedule plan. Filling it is the
same picker that filled it the first time, carrying the same away and served-recently warnings.

What the separate object added was a volunteer-facing button nobody liked and a leader-facing inbox
that duplicated the plan. The table, the repository and both screens are gone.

## Songs and the Stage contract are deferred, October 2026

Hearth Stage is being built in its own repo, with its own song library and its own importers. So
this board owes it nothing: not the song schema (R12.x), not `/api/stage/v1`, not the `song_usage`
insert, not `packages/songs`. F12 has no stories and gets none until somebody asks for them.

0.4 is serving and service planning. A plan item that would have been a song is a plan item with a
title, which is what a church without a library has anyway.

The shape in PRD section 9.4 still stands for whenever songs return: lyrics as ordered labeled
sections, arrangement sequences as data, translations section-aligned.

## R2.9 was cut, October 2026

Skills, interests and spiritual gifts were built as three managed lists and taken out the same day.

A church management system holds what a church needs to run: who is here, who is in a group, who is
checked in, what has been given. A record of what every member is good at and what they feel called
to is a different kind of thing to hold about somebody, and holding it is not worth what it costs
them. It was also one more set of lists for a volunteer to maintain for a question most churches ask
by asking a person.

The requirement stays in the PRD marked cut, like R3.1. If serving in 0.4 needs to know who can do
something, a team records its own requirements against its own positions, which is a smaller claim
about a smaller number of people who volunteered for it.

## How somebody gets an account, decided October 2026

Sign-up sent everybody to create a church. A member arriving because their church asked them to was
offered a form for starting a church of their own, and `people.app_user_id`, the field that ties an
account to a record, was written by nothing in the product.

The order is church, then people, then accounts. A church is created first. People are records the
church makes, by import, by a form, at a check-in desk or by hand. An account **claims** one of those
records, and the proof is an address the church already wrote down. This is what Planning Center,
Breeze and Church Center all do, for the same reason: nobody lets a stranger into a congregation's
directory.

Three ways in.

| Door | Who | What happens |
|---|---|---|
| Invitation | Staff, leaders, and any member the church invites | Exists (HRT-108). The invitation now carries the person record, so accepting links the account to it. |
| The church's join link or code | A member the church pointed at it | The code is the gate. They sign up and they are a member. Their address is matched against the contacts on the church's records: a match claims that record, and anything else gets a visitor record written on arrival. |
| Creating a church | A pastor or administrator starting out | The church is created immediately and is provisional until a human has looked at it (HRT-115). |

A child's record is never claimable, and neither is one somebody else already holds. Both get a new
record instead, which the church merges (R2.8) if it turns out to be the same person.

An approval queue was built and taken out again on the same day. It put a task on a volunteer every
time a regular signed up, for a door the church had already chosen to open by handing out the code.

**Provisional** means the church works for the person who made it, capped: a small number of people,
no join link, no invitations, no outbound email. A real church is unblocked in an hour, which is what
the sixty-minute time-to-value metric needs. An abuser gets nothing worth having.

---

## Now

| | |
|---|---|
| **Active** | Nothing |
| **0.2 still owed** | Nothing. R2.9 was cut. Safeguarding paperwork moved to the children's ministry pass (0.9). Blocked by later releases: R8.17 the two-adult rule waits on serving (0.4), R9.8 group messaging waits on a provider being set up with the church. R3.1 was cut. |
| **Audit, October 2026** | Every 0.1 and 0.2 requirement checked against the board, twice. The first pass found R1.14 (**HRT-110**, built), R8.12 (**HRT-112**, built), R1.2 (**HRT-111**, in the schema with no screen) and account creation (**HRT-109**, built). The second pass found that one wildcard tag, `R2.x` on HRT-40, was hiding four more: **R2.9**, **R2.11**, **R2.14** and **R2.15**, none of them built. `scripts/check-backlog.mjs` now fails CI when a 0.1 or 0.2 requirement has no story naming it, and a wildcard no longer counts. |
| **Was owed** | R19.5 the three importers and R22.1 to R22.3 onboarding, both built. R21.10 and R21.11 moved to the children's ministry pass. |
| **Waiting on a test** | **HRT-26** background checks, **HRT-62** the class board and rosters, **HRT-63** incident reports, **HRT-83** groups, **HRT-84** the leader scope, **HRT-85** group attendance, **HRT-86** the finder, **HRT-90** a group's page, **HRT-91** one groups screen, **HRT-93** follow-up pipelines, **HRT-94** the triggers, **HRT-95** the queue, **HRT-96** the board, **HRT-97** editing the six, **HRT-99** printed-directory consent, **HRT-100** the printed directory, **HRT-105** the setup wizard, **HRT-106** help, **HRT-107** time to value, **HRT-108** who can get in, **HRT-109** signing up, **HRT-110** saved lists, **HRT-112** the bag label, **HRT-113** the UI sweep, **HRT-114** joining a church, **HRT-119** search, **HRT-120** the person timeline, **HRT-27** birthdays, **HRT-79** teams and positions, **HRT-80** the schedule, **HRT-124** answering a serving request, **HRT-127** the order of service, **HRT-128** notes on an item, **HRT-129** files on an item |
| **Next** | **HRT-202** navigation scoped to the role. Then HRT-203 the dashboard, HRT-204 People, HRT-205 the palette, HRT-206 states, HRT-207 notifications, HRT-208 the remaining screens. **HRT-150** the public form link waits behind the redesign. Still waiting: **HRT-87** and **HRT-123** on messaging, **HRT-34** on households having a page, **HRT-39** on a church outgrowing the export. **HRT-123** is skipped: with messaging deferred there are no church-supplied credentials to encrypt. F16 messaging, finance and the children's paperwork stay deferred until asked for. | **HRT-126** waits on a church having a messaging provider set up, the same as HRT-87. R10.7 was cut. |
| **Order after that** | **1.0**: F4 forms, F17 portal, F6 pastoral care, F15 calendar, F14 events, F18 reporting, F20 API. Then **0.9** the children's ministry paperwork. Then **0.3** money, last, which also releases the stories held back from 1.0. Songs and the Stage contract are deferred until asked for. |
| **Waiting on somebody else** | **HRT-87** group messaging and **HRT-126** serving reminders both wait on a church having a messaging provider set up. **HRT-13** MFA stays deferred. |

### HRT-16, how to test it

"Fields" is in the header. This is the answer to "can it track X", for any X.

1. **Define some.** Add one of each type. A choice field asks for its choices, one per line, and
   refuses to save with none. Blank and duplicate choices are dropped.
2. **Fill them in.** Add or edit a person. The fields appear under "More", in the order they were
   defined, each rendered for its type. They save with the rest of the form and show on the record.
3. **Bad input.** Type letters into a number field, or `01/05/2024` into a date field. Refused, with
   the message next to the field.
4. **Rename.** Rename a field. Values already recorded stay attached. The type cannot be changed,
   deliberately: turning a date into a number would leave every recorded value unreadable with no
   honest way to convert it.
5. **Delete.** Deleting says it removes everything recorded in the field, and it means it. That is
   the one thing here that is not reversible.
6. **Roles.** `staff` can fill fields in but cannot define them. `pastoral` and `member` can do
   neither.

### HRT-37, how to test it

Nothing to click. Open the Actions tab on GitHub after this push and watch three jobs run.

- **Types, catalogue, contrast.** Typecheck, the contrast audit, the externalised-strings scan, a
  check that the generated `tokens.css` matches its source, and a grep for em dashes.
- **Build.** The production build, with no database reachable.
- **Tenant isolation and authorization.** A real Postgres, migrated and seeded from scratch, then
  the adversarial suite. This is the 0.1 exit criterion running on every push.

The audit found four real defects the first time it ran, listed in the commit.

### HRT-28, how to test it

"Import" is in the header, and on the directory next to "Add someone".

1. **Export from anywhere.** An .xlsx workbook or a CSV, with a first name and a surname column.
   A birthday formatted as a date in Excel comes across as a date, not as the number 31514. Columns called
   "First Name", "DOB", "Membership Status", "Mobile Phone" and so on are matched for you. The guess
   is always shown and always editable.
2. **The preview writes nothing.** It lists what will be added, updated and left alone, with the
   rows that are not simply additions at the top, because those are the ones worth reading.
3. **Duplicates.** Import the same file twice. The second run leaves everyone alone and says why,
   naming the person it matched and how. Switch to "Update them from the file" and it fills in what
   the first file did not carry, without blanking anything.
4. **A file with a person on it twice** catches the second one and names the line.
5. **Bad data.** A row with no name, or a date like 13/04/1990, is reported against its own line
   number in your file rather than being imported wrong.
6. **Roles.** `staff` can import. `pastoral` and `member` cannot, and the server refuses even if the
   page is bypassed.
7. **Export everything.** On the directory toolbar, on the right. One click, a zip with a CSV per table,
   the whole thing as JSON, and a README. Open it in Excel. Sign in as `admin@riverside.example.org`
   and export again: the confidential note bodies are absent and the README says they were withheld.
   `staff` and `pastoral` cannot export at all.
8. **Undo it.** Past imports are listed under the wizard. "Undo this import" removes the people it
   added and puts back the ones it changed. Edit somebody the import created first, then undo: they
   are archived rather than removed, because that edit was not part of the mistake. Undoing is Owner
   and Admin only, since one press can remove hundreds of people.

### HRT-40 and HRT-25, how to test it

The directory now has a toolbar.

1. **Search.** One box. Type a first name, a surname, part of an email, or a phone number with no
   punctuation: `5557431` finds `(512) 555 7431`. It waits until you stop typing.
2. **Filter.** Status, tag, and whether there is an email or a phone. They combine, and they land in
   the URL, so "everyone with no email address" is a link you can send to someone.
3. **Sort.** Press a column heading. Press it again to reverse it.
4. **Select.** Tick rows, or the box in the heading. A bar appears above the table with add a tag,
   remove a tag, set status, and archive. Archive confirms and says how many.
5. **Pages.** Fifty at a time. Changing a filter or a sort returns you to page one, so narrowing
   the list while on page four cannot look like "no results". The selection clears when you move
   pages, because it only ever held what was on screen. An export still exports every matching
   person rather than the page you were on.
6. **Export.** With no filter it downloads the whole archive, the zip. With a filter it downloads
   just those people as one CSV, and the file matches exactly what is on screen because the server
   ran the same query the URL describes.
7. **Roles.** `staff` can select, tag and set status, and has no archive button.
   `pastoral` sees no checkboxes and no export.

### HRT-24, how to test it

1. **Pick two yourself.** Tick two people in the directory. A Merge button appears in the selection
   bar. The review screen opens with your pair at the top, badged "You picked these". This is the
   path for records the detector cannot spot, like Mike Bennett and Michael Bennett on two different
   email addresses.
2. **Or let it find them.** Add two people with the same email address, or import a file twice
   choosing "Add them again anyway". A banner appears on the directory linking to the queue, and the
   pair is marked by how sure the match is.
3. **Choose which survives.** Press either card. Where the two records disagree, you pick which
   value wins, field by field. Switching which record survives resets those choices rather than
   inverting them.
4. **Merge.** Contact details, notes, tags, milestones and history move across. The other record is
   archived and you have 30 days to undo.
5. **Undo it.** Past merges are listed underneath. Undo puts both records back, returns exactly the
   rows that moved, and restores any field that was written over. A note written *after* the merge
   stays with the surviving person, because it was never part of it.
6. **Roles.** Owner and Admin only. `staff` can edit people but cannot merge them, since one press
   moves every note off one record and onto another.

### HRT-22, how to test it

Open anyone's record. A Relationships card sits above Tags.

1. **Add one.** Choose a person and a relationship, then Add. Open the other person: the matching
   relationship is already there. Spouse pairs with spouse, parent pairs with child.
2. **One-way on purpose.** Guardian and emergency contact are recorded on one record only. Being
   someone's emergency contact does not make them yours.
3. **Do not contact.** Record it between two people. It appears in red, at the top of both records.
   Now try to add either as the other's emergency contact: refused.
4. **Order of entry does not matter.** Record Gregory as a child's emergency contact first, then
   record a do-not-contact order between them. The order is accepted and the emergency contact is
   removed, with a line saying so. A safeguarding instruction that waits for tidying up is an
   instruction that does not take effect.
5. **Who may lift it.** Anyone who can edit a person can record a do-not-contact order, since the
   person who hears about a custody arrangement on a Sunday is rarely the Owner. Lifting one asks
   for confirmation and is Owner and Admin only.
6. **Finding the person.** The picker is a combobox. Type any part of a name and the list narrows.
   Arrow keys move, Enter chooses, Escape puts back what was there.

Check-in enforcement of these orders is R8.9, in 0.2. This story records them.

### HRT-23, how to test it

Open anyone's record. A Milestones card sits above Relationships.

1. **Record one.** Choose a milestone, a date and an optional note. The list reads most recent
   first, which is the order somebody reads a life in.
2. **Dates that have passed only.** A date in the future is refused. It is a typo in the year every
   time.
3. **A death sets the status.** Record a death and the person's lifecycle status becomes Deceased,
   with a line saying so. A church that records a death and then sends the family a birthday email
   has been failed by its software.
4. **A first visit fills a blank date.** If the person has no first visit date, recording the
   milestone sets it. If they already have one, the milestone is recorded and the date is left
   alone, because someone corrected it on the record for a reason.
5. **Removing one leaves the person alone.** Deleting a death record does not decide that somebody
   is alive. Change the status on the record itself.

### HRT-15, how to test it

A Settings link appears in the header for Owner and Admin.

1. **The profile.** Name, legal name, address, phone, website, timezone and colour. The legal name
   is separate because it is what goes on a giving statement under IRS Pub. 1771 (R13.14), and it is
   rarely what the church calls itself.
2. **The timezone is searchable.** Type "Chicago" or "Denver". An invented zone is refused by the
   server as well as the form, because an unknown zone breaks every date in the product.
3. **Service times.** Add "First service", Sunday, 09:00. They list Sunday first, then by the clock.
   A separate record per service, because a church with a 09:00 and an 11:00 counts them
   separately and a free-text "Sundays 9 and 11" cannot be counted. Attendance in 0.2 reads these.
4. **Roles.** Owner and Admin. Staff edit people and do not rename the church. The link is hidden
   for everyone else, and the write is refused even if the URL is typed in.

The logo arrived with HRT-18. The brand colour is stored but no screen reads it, so the picker is
off the settings page until one does (HRT-43). Putting it back is one component and one line.

### HRT-42, how to test it

Every date on a person's record, a milestone and a custom field.

1. **It is ours now.** The panel uses the product's own colours, corners and type, in light and
   dark, and it looks the same in Safari, Chrome and Firefox.
2. **Type it.** A date of birth in 1954 is typed, not paged to. The field accepts 06/14/1954,
   6/14/54, 06-14-1954 and the ISO form. A typo puts back the date that was there rather than
   emptying the field.
3. **Or point at it.** Month and year are dropdowns, so a birthday is two presses and a date rather
   than eight hundred month presses.
4. **Keyboard.** Arrows move a day, PageUp and PageDown move a month, Home and End go to the ends of
   the week, Enter chooses, Escape closes. The grid is one tab stop.
5. **Limits.** A milestone cannot be given a future date, and those days are greyed and refuse the
   press.

### HRT-14, cut

The device list and remote revoke came out in October 2026. A church of this size has one admin and
one laptop, and a screen listing browser strings answered a question nobody was asking. R1.10 came
out of the PRD with it.

What a church still has: signing out ends the session on that device, and a password change
invalidates the refresh tokens everywhere. What it no longer has: ending a session on a device that
is not in front of them. If a laptop is lost, the answer is to change the password.

### HRT-45, how to test it

Press your name in the top right.

1. **The navigation is one item now.** Directory. Tags, Fields and Settings were beside it, which
   put the two things a volunteer touches every day next to two they touch twice a year.
2. **Five tabs, by role.** Account and Security for everyone. Church for Owner and Admin. Tags for
   anyone who can edit people. Fields for Owner and Admin. Sign in as staff and the Church and Fields tabs are
   absent, and typing the URL is still refused by the query layer.
3. **Each tab is a real page.** Reload on Tags and you stay on Tags. The links can be shared and
   opened in a new tab, which a widget that swaps panels cannot do.
4. **Your name, not your email.** The header shows the name on your account, falling back to the
   email address when there is none. The role badge came off: it is on the Account tab, and the
   header is not where somebody checks what they are allowed to do.
5. **Signing out moved** into the Account tab. It used to sit beside the name people aim for, which
   is a press somebody makes by accident.
6. **Devices are named.** Sign-in happens on the server, so Supabase was recording the Node fetch
   agent and every row read "Unknown device". The browser's own agent is passed through now.
   Sessions created before this change stay unknown, since the agent is recorded once.

### HRT-18, how to test it

Settings, the Storage card at the top.

1. **Add a logo.** A PNG, JPEG or WebP under 2 MB.
2. **Replace it.** Upload a different one. The old file is forgotten and removed from the bucket,
   so changing a logo ten times costs one logo.
3. **Things that are refused.** An SVG, an empty file, anything over 2 MB. Each says which rule it
   broke, and nothing is written.
4. **The quota is real, and out of sight.** It is checked in the query layer before the bytes are
   sent. Nine tests cover it, including the refusal that takes a church over the line. Nothing on
   screen reports usage until a church passes 80%, since a bar reading 282 kB of 2.1 GB only asks
   somebody to worry about a number that will never move. Showing usage properly is HRT-44.
5. **Roles.** Owner and Admin. The route refuses a staff upload even with the button hidden.

The bucket is private. The logo is served through a signed URL that lasts an hour, so a leaked path
expires. Writes are checked twice: our query layer for the quota and the rules, and a bucket policy
that reads membership from our own tables, so a user can only write into their own church's folder.

### HRT-47, how to test it

A Services tab sits beside Directory. One concept, one button.

1. **Add a service.** Name, date, time, and "Repeats every week". A church meeting at 09:00 and
   11:00 on a Sunday adds two, once, and never touches a calendar again.
2. **The repeat keeps itself going.** Six months of dates appear at once, and the horizon moves on
   its own each time the page is read. There is no calendar to fill and no button asking you to
   maintain one.
3. **Leave the box unticked** for a one-off: Carols by candlelight, Good Friday, a funeral.
4. **Cancel a week**, with a note like "Snow". It stays on the list, greyed, because a Sunday that
   vanished leaves a gap in the attendance record that reads as a collapse. Put it back with one
   press.
5. **Stop a repeat.** Future dates come off. Everything already recorded stays, because deciding to
   stop meeting on a Wednesday is not deciding that two years of Wednesdays did not happen.
6. **Roles.** Owner, Admin and Staff. Staff plan services, and cancelling one is not renaming the
   church.

An earlier build of this had three ideas (a weekly pattern in Settings, a Fill the calendar button,
and the services themselves) and two setup steps before any value. It is one idea now.

### HRT-68 and HRT-69, how to test them

1. **Repeats are a choice now.** Add a service and pick: does not repeat, every week, every two
   weeks, every month. Monthly means the same weekday of the month, so a second Tuesday stays a
   second Tuesday rather than drifting onto a Saturday.
2. **A month with no fifth Sunday simply has none.** Moving it to the fourth, or to the next month,
   would invent a service the church never said it holds.
3. **An end date.** A Lent course that runs six Wednesdays stops on its own. The end date only
   appears once something repeats, because an end date on a one-off asks about something that
   cannot happen. An end date before the first date is refused.
4. **Fortnightly counts from the first date**, however far ahead you look, so the parity never
   slips when you page forward a year.
5. **One month at a time.** Arrows move a month, and "This month" comes back. The list used to be
   every service the church had ever held or scheduled, which is fine in week one and thousands of
   rows in year three.

### HRT-51, how to test it

Two lists at the top of Services: **New lately** and **Not seen lately**.

1. **Tick somebody at three services, then stop.** After three held services without them, they
   appear in Not seen lately with how many they missed and when they were last there.
2. **Cancel one of those services.** They drop off, because a Sunday the church cancelled is not a
   Sunday anybody missed. A church that cancelled for snow must not accuse half its congregation of
   drifting the following week. This is R7.6's acceptance criterion.
3. **Somebody who has never attended is not in the list.** They have not stopped coming, and putting
   them there buries the people who have.
4. **Two services on one day count once**, the same as a visit does.
5. **The threshold is three** and lives on the church record, ready to be changed per church.

Both lists link straight to the person, and the pipelines in R5.3 will read the same two queries.

### HRT-50, how to test it

On a service's "Who was here" screen.

1. **Tick somebody who has never been.** A "First time" badge appears beside them, and a count of
   how many are new shows at the top.
2. **Tick them at the next service.** "Second time".
3. **Untick their first visit.** The badge on the second service becomes "First time". Nothing is
   stored on the person: the number is counted from the record every time it is asked, so a
   correction, a missed service added later, or a year of imported history all give the right
   answer. A flag written at the time would be wrong at all three.
4. **Two services on one Sunday count as one visit.** Somebody at the 09:00 and the 11:00 on their
   first Sunday is first-time at both. They turned up once.

The Monday morning list, and the pipelines in R5.3 that read it, use the same query.

### HRT-49, how to test it

On Services, a past service has a "Who was here" button.

1. **Tick names.** The tick appears the moment you press, and the write goes behind it. A press that
   fails puts the tick back and says so, because showing it saved when it did not is worse than
   being slow. No page reloads at any point.
2. **The acceptance criterion is 120 people in under three minutes on a tablet.** Rows are large,
   because this is done standing up by somebody holding a tablet in one hand.
3. **Search narrows the list**, and "Mark everyone shown" acts on what the search left. That is how
   a whole household or a whole surname goes in one press.
4. **Press the same name twice quickly.** Nothing breaks, because the write is idempotent in both
   directions.
5. **Untick to correct a mistake.** There is no absent record: absence is the lack of a record, so
   a correction is a delete and the audit log catches it like any other write.
6. **A cancelled service refuses ticks.**

Headcounts and named attendance are separate on purpose. A church that only ever counts heads is
finished at HRT-48 and is never asked for names.

### HRT-48, how to test it

On Services, a service that has already happened has a Count button.

1. **Count.** Adults, children, visitors, and a note. The total appears in the Attendance column.
2. **Leave a box empty.** Empty means nobody counted. Zero means nobody came. They are kept apart,
   because a year of attendance reports rests on the difference and a clipboard cannot tell them
   apart.
3. **A cancelled service has no count**, and the query layer refuses one if you reach for it.
4. **A service still to come has no Count button.** There is nothing to count yet.

Three numbers and a note is the whole of attendance for most churches this size, and the product
does not ask them for more.

### HRT-46, how to test it

It asks for nothing. No email, no password, no account, and no Supabase setting to turn on. A demo
that starts with a sign-up form is a demo for the people who were going to sign up anyway.

1. **Sign out.** On the landing page, press "See a demo" in the top right.
2. **A church of your own arrives**, named Grace Community Church, with twenty-one people,
   households, tags, milestones and relationships. It takes a few seconds to build, and the button
   says so while it works.
3. **Every page says it is a demo**, in a strip above the header, with when it disappears and a way
   to create a real account.
4. **Press everything.** Archive people, merge them, remove the lot. It is your church and nobody
   else's, so nothing here can reach a real one.
5. **Press it twice**, from two browsers. Two separate churches, each with one member.
6. **The pass cannot be turned into a way in.** It is a signed cookie naming the throwaway church.
   Rewriting it fails the signature, and even a correctly signed pass naming a real church is
   refused, because the lookup takes only a church with a demo expiry in the future. Four tests
   cover that, including the expired case.
7. **It goes away.** Demo churches are swept when they run out, which happens on the way in to the
   next one, and a church without an expiry is never swept.

This is where the sample data lives now. It is reachable from nowhere inside a real church.

### HRT-31, what it is now

The data set and its loader exist, with five tests. **Nothing in the product calls them.**

A church that signs up has real records, and a button that pours twenty-one invented people into
their directory is one press away from a giving statement addressed to somebody who does not exist.
Fake data belongs somewhere obviously not theirs.

So the way in is HRT-46: a demo somebody can look at before they have an account at all. Until that
exists the loader is reachable only from a script.

### HRT-32, how to test it

Churches used to exist only because the seed script made them. Now anyone signed in can start one.

1. **From nothing.** Sign out. Sign in as `founder@newchurch.example.org` on the Password tab. You
   land on "Choose a church" with "Create a church account" as the main action.
2. **Create it.** Name it. The timezone is already filled in from your browser. You arrive in your
   own church as its owner, with an empty directory.
3. **The slug.** A church called "St. Mark's Riverside" becomes `st-marks-riverside` in the URL.
   Name a second one the same thing and it gets a `-2`. Call one "Settings" and it becomes
   `settings-church`, because route words are reserved.
4. **Isolation.** Add a person to the new church. Sign in as `pastor@riverside.example.org` and
   confirm they are nowhere in Riverside. Then try `?church=<your new slug>` as the Riverside
   pastor: refused, exactly like a church that does not exist.
5. **Existing members.** The same button is on the chooser for someone already in a church, as a
   secondary action rather than the main one.

### HRT-70, how to test it

Services, with a month showing.

1. **Three shapes.** The control beside the month name switches between list, calendar and tiles.
   The month arrows and "This month" keep whichever is showing, and so does a bookmark.
2. **The grid.** Every service is a chip on its day, coloured by state, and today has a ring.
   A chip opens the same buttons the list row has: the roster, the count, edit, cancel.
3. **A month with nothing in it.** The calendar still draws. The list and the tiles say so.
4. **Add a service.** Repeats starts at "Does not repeat", and the end date appears once it repeats.
5. **The time field.** It offers 9:00 AM rather than 09:00, opens near nine in the morning rather
   than midnight, and takes "9", "9am", "9.30pm" or "21:30" typed.
6. **The date field near the bottom of the screen.** Open the calendar with the dialog low in the
   window. It opens upward and stays on screen.
7. **The month and the year.** Press "September 2026" in the calendar header. A grid of months
   appears in the same panel, and pressing the year again gives twelve years at a time. Nothing
   opens an operating system menu, and nothing leaves the window.

### HRT-54, how to test it

Settings, then Rooms. Owner or Admin only.

1. **Create one.** Nursery, birth to 2 years, holds 12, one volunteer per 4. The age boxes take
   months or years, so a nursery can be written in months and a kids room in years.
2. **What it refuses.** An oldest age below the youngest. A capacity of zero. A second room called
   "nursery" when "Nursery" exists.
3. **What it allows.** A room with no ages, no capacity and no ratio. A church that has not decided
   is not made to.
4. **The colour.** It prints on the child's label and the guardian's, so a volunteer can send a
   parent to the right door by colour. Pick one per room and keep them apart.
5. **Order.** Move a room up and down. The station shows them in this order.
6. **Archive.** The room leaves the list and comes back with Restore. Nothing that points at it
   moves.

The suggestion itself has no screen yet, because there is no station yet. It is covered by tests:
inclusive at the youngest age, exclusive at the oldest, so 0 to 24 months and 24 to 48 months tile
with no month belonging to both rooms or to neither, and an overlap goes to the narrower room.

### HRT-55, how to test it

Settings, then Stations. Owner or Admin only.

1. **Create one for each device.** A foyer desk a volunteer runs, a kiosk families use themselves,
   a tablet carried around, and the family's own phone. There is one phone station a church, since
   there is one household flow and two configurations of it would be two answers to one question.
2. **What it may touch.** Tick rooms and services, or tick none, which is every room and every
   service. A church with one desk never has to think about it.
3. **The device.** Open Check-in in the header. The device asks which station it is, once, and
   remembers. It is stored on the device, so two tablets signed in as the same volunteer are two
   stations.
4. **Retire one.** Archive the station, then reload Check-in on the device pointed at it. It asks
   again rather than carrying on against a configuration nobody maintains.

The check-in flow itself is HRT-56 onward. This story is the configuration those read.

### HRT-72, how to test it

The landing page, then "See a demo".

1. **It opens.** The wait used to be the time it takes to build a church. Two are now built and
   waiting, so pressing the button is a lookup.
2. **Press it again in another browser.** A second visitor gets a second church, never the first
   visitor's.
3. **Press it a third time.** The pool is empty by then, so that one is built while you wait, which
   is the old behaviour and the reason the pool exists. The one after that is quick again.

### HRT-56, how to test it

Check-in in the header, with a station claimed and a service on today.

1. **Find a family.** Type a surname, a first name, what a child is called, or the last four digits
   of a phone number. Punctuation in the stored number makes no difference.
2. **The whole household comes back**, children first, youngest first, which is the order the desk
   works in. Typing a parent's number gets their children, because the children are what the
   station is for.
3. **Rooms are filled in** from each child's date of birth, and every one of them can be changed.
   An adult takes a name badge and no room.
4. **One press.** Everybody ticked goes in together. Press it again and nothing doubles: the room
   a child was sent to first stands, since somebody has already been told where to find them.
5. **Undo.** A child checked in by mistake comes off in one press, and the attendance mark goes
   with them.
6. **The room fills.** Set a room capacity of one in Settings, check two children into it, and the
   second shows the room as full.

The label, the security code and the checkout are HRT-57 and HRT-59. **This station cannot run a
real Sunday until those are in**, because no child should be released on anything weaker than a
code.

### HRT-57, how to test it

The desk, with a child checked in.

1. **Two labels a child.** One for the child, one for whoever collects them, carrying the same code.
   The code is the biggest thing on both, because it is what two people who have never met compare
   across a counter.
2. **The code is readable.** No O beside 0, no I or L beside 1, no S beside 5. Whatever is printed
   is what somebody types back.
3. **Codes do not count up.** Check in several children and compare. One code says nothing about the
   next, which matters because anybody in the queue can see a label.
4. **An adult gets no code.** A name badge is not a claim on a child.
5. **Press check in twice.** The child keeps the code they already have. Two codes for one child is
   two labels that do not match each other.
6. **Say the labels did not print.** The check-in goes back, because a child marked present with no
   label in a parent's hand cannot be proved to belong to whoever comes for them.

Brother QL and Dymo are HRT-61. This prints through the browser, which is every printer a church
already owns.

### HRT-73, how to test it

Settings, then Stations. Set a station's mode to "Families use it themselves", and open Check-in on
a device pointed at it.

1. **Everything is bigger.** Station density: thumb-sized targets and text readable at arm's length
   from a stand.
2. **Rooms are buttons, not a menu.** A parent reads four room names at once faster than they open a
   dropdown.
3. **Nothing a parent has no business touching.** No undo, no other household on screen once they
   have chosen theirs, no way further into the church's records.
4. **It clears itself.** Twenty seconds after a family finishes, the screen is empty again, so the
   last family's children are not left on a screen in the lobby.
5. **The counter desk is unchanged.** Set the mode back to "A volunteer runs it" and the desk
   returns.

### HRT-58, how to test it

A child's record, then the desk.

1. **Record one.** Open a child, Health, Allergies: "Peanuts". A medical note holds anything else a
   room needs, such as an inhaler.
2. **It is impossible to miss.** Check that child in. The allergy fills a red banner above the
   button, and the button does not work until somebody has pressed "I have read this". A volunteer
   finishing a check-in without having seen it is the failure the requirement exists to stop.
3. **It prints.** The child's label carries it.
4. **A child with nothing recorded shows nothing at all.** Silence means nobody has written anything
   down, and a screen saying "no allergies" would be claiming something the church was never told.
5. **The kiosk does the same**, because a parent checking their own child in reads it too.
6. **Editing it is audited**, like every other change to a person.

### HRT-59, how to test it

Check a child in, then find the family again.

1. **The code releases them.** Type what is on the guardian's label. Spacing and case are forgiven.
2. **A wrong code releases nobody.** So does an empty one.
3. **Who is collecting.** The list is anybody recorded as a guardian or emergency contact, plus
   anybody who lives in the household. A church that had to name every parent before a Sunday works
   would stop keeping the list, and a list nobody maintains protects nobody.
4. **Somebody not on the list is stopped**, holding the right code.
5. **A restriction stops the person it names**, code or no code, and it is asked about before the
   code so the conversation happens once rather than twice.
6. **Every stop can be passed**, and passing one costs a sentence saying why. The sentence, the
   child, what was passed and who decided are written down and cannot be edited afterwards.
7. **Twice is refused.**

Record a do-not-contact between a child and an adult in their household to see the custody case.
The product refuses to record that person as a guardian at all once the order exists, so the
household is the only way the two facts can sit together.

### HRT-74, how to test it

A day with two services on it, such as Riverside's 30 September.

1. **The dropdown says which is which.** Name and time, since two services called "First" and
   "Second" tell a volunteer nothing about which one is on.
2. **It opens on the one happening.** Before the first, the first. During it, that one. After the
   second has started, the second. A service that finished hours ago is let go of, and the nearest
   one is offered instead.
3. **A day with nothing on it** says so, and offers no way to check anybody in.

### HRT-75, how to test it

1. **Search by person.** Type three letters of a first name at the desk. The rows are people, with
   the household on a quiet second line. Tap a row and the whole family opens, the way it did.
2. **Surnames.** Type a surname. Every person who has it is a row of their own.
3. **The start of a name.** "hoa" finds no Ochoas. "och" finds them all.
4. **Speed.** Type a name, then backspace. The earlier answer is there at once.

### HRT-60, how to test it

Use a real tablet or a second browser window, and the browser's own offline switch (DevTools,
Network, Offline). The station has to be claimed and a service chosen while the network is up, so it
has something to carry.

1. **It says so.** Turn the network off. The bar appears and says there is no network.
2. **Search still works.** Type a name. It comes back from what the station pulled down.
3. **Check in.** Check a family in. The labels window opens and prints, with a code on each pair.
   The bar now says how many are waiting.
4. **Reload it.** Reload the page with the network still off. The station comes back rather than the
   browser's error page, and the waiting count is still right.
5. **Check out.** Collect one of them. The code is asked for and checked, the pickup list is the one
   the station pulled down, and a person not on it is still stopped.
6. **Reconnect.** Turn the network back on. Within a few seconds the waiting count goes to zero.
   Open the service on another device: every check-in is there, with the codes that were printed,
   and the times are when they happened rather than when the wifi came back.
7. **A conflict.** With the station offline, check a child in. On another device, check the same
   child into a different room. Reconnect. The station reports it and leaves the record alone.
8. **Codes.** Check in forty children offline. They all get codes, all different, and none of them
   collides with anything the online desk issued.

### HRT-61, how to test it

The station's **Labels** setting picks the stock, so set it before printing.

1. **Plain paper.** Leave it on plain paper, check a child in, and print. The pairs are tiled on the
   sheet with a dashed line to cut along. This is the answer for a church with no label printer, and
   it should look like one rather than like a fallback.
2. **Brother QL.** Set it to Brother QL and print to a PDF. Each label is its own page, 62mm by
   40mm, edge to edge with no margin. On a real QL with DK-22205 tape it comes out the width of the
   roll.
3. **Dymo.** Set it to Dymo and print to a PDF. 89mm by 28mm, and the code sits beside the name
   rather than under it, because 28mm is not tall enough for both.
4. **The code.** On all three, the code on the child's label matches the one on the guardian's, and
   it is the largest thing on the label.
5. **The allergy.** A child with an allergy recorded has it on their own label, and not on the
   guardian's.

### HRT-62, how to test it

**Kids classes** is in the header. It is the person walking the corridor, not the desk.

1. **Counts.** Check two children into a class from the desk. Its card shows two, and the
   outstanding count at the top matches.
2. **The roster.** Tap the card. It opens in front of the board, scrolling inside itself, so a
   class of thirty does not push every other class off the screen.
3. **Capacity.** Fill a class to its capacity: it says full. One more: over capacity.
4. **Print.** Print inside the roster opens that class's sheet and the printer dialog: names,
   codes, allergies, and who has been collected, for the wall.
5. **It keeps up.** Leave it open and check a child in from another device. Within twenty seconds
   the board moves on its own.

### HRT-63, how to test it

**Incidents** is in the header for Owner, Admin and Pastoral, and for nobody else.

1. **File one.** Open Kids classes, tap a class, and press Report an incident against a child. Write
   what happened and what was done. It says, once, that a report cannot be edited or deleted.
2. **Who can write one.** Sign in as a check-in volunteer and file one from the station. It saves.
3. **Who can read them.** As that same volunteer, there is no Incidents link, and going to the URL
   says to ask an admin. A report names other volunteers and sits beside other children's, so
   writing one and reading them are different permissions.
4. **The guardian.** A new report shows Guardian not told. Press the button on the Incidents screen
   and it records the moment. Pressing again does not move it.
5. **It is kept.** There is no edit and no delete anywhere, deliberately, including for an Owner.
6. **It is audited.** The report appears in the audit log like every other write.

### HRT-83, how to test it

**Groups** is in the header.

1. **Types.** A church starts with five: small group, ministry team, class, committee, other. They
   are what the Type picker offers.
2. **Create one.** Name, what it is for, type, day, time, how often, where, and how many it holds.
   Everything except the name is optional, so a group with no pattern saves.
3. **Open it.** Tapping a group opens it with its roster in front of the list.
4. **The roster.** Search a name the way you do at check-in, choose leader, co-leader or member, and
   add them. Leaders sort to the top of the roster and their names show on the card.
5. **Adding twice.** Adding somebody already in the group moves their role rather than listing them
   twice.
6. **Removing.** Remove somebody. They come off the roster. The record of their time in the group
   stays, which is what makes a year of discipleship readable later.
7. **Archive.** Archiving takes it off the list and keeps its roster. Restore brings it back.
8. **Roles.** A member cannot create or change a group.

### HRT-84, how to test it

This one is a boundary, so test it by trying to get past it. You need a person record linked to a
signed-in account, and that account given the group_leader role.

1. **The directory.** As a group leader, Directory shows the people in the groups you lead and
   nobody else. The count under it matches what is listed.
2. **By URL.** Open a person who is not in your group by their id. It says not found, rather than
   showing them.
3. **By export.** Press export with a filter. The CSV contains your group and nobody else.
4. **Following the roster.** Remove somebody from your group. They leave your directory. Add them
   back and they return.
5. **Leading nothing.** A group leader who leads no group sees only themselves.
6. **Everybody else.** An owner, admin, staff, pastoral or check-in volunteer sees the whole church,
   exactly as before.

### HRT-85, how to test it

Open a group and press **Attendance**. Use a phone if you have one to hand, since that is what it is
built for.

1. **The day.** It opens on the group's own meeting day counting back from today, so recording on
   Wednesday offers Tuesday. Change the day and it loads that meeting.
2. **The default.** Everybody on the roster starts present. Tap the two or three who were not there
   and press save. That is the whole interaction: for twelve people with four missing it is four
   taps and a submit.
3. **Coming back to it.** Reopen the same day. It shows what was recorded rather than everybody
   ticked again, so fixing one name does not re-tick the room.
4. **It did not meet.** Press it, then save. The meeting is recorded as not held and the names are
   cleared, because a group that was cancelled and a leader who forgot should not look the same.
5. **The history.** Under the sheet, the last eight meetings with how many came.
6. **Who can.** A group leader can record for their own group and is refused on anybody else's. A
   member cannot record at all.

### HRT-86, how to test it

**Find a group** is on the Groups page.

1. **Browse.** Every listed group, with the day, time and place. An unlisted group is not there.
2. **Filter.** Type, day and where. "hall" finds The Hall, since people type what they say.
3. **Ask.** Press ask to join. The card changes to Asked. Pressing again does not make a second
   request.
4. **Browsing by kind.** The groups sit under their kind, each with the church's own words for it
   and how many are open. Filter by day, who it is for, online, children welcome, or type in the
   box: it searches the name, the description and the place.
5. **A closed group.** A group that is not taking requests says so instead of offering the button,
   and it is still listed, because somebody looking for a Tuesday group should see the church has
   one. Untick "include closed and full" to drop them.
6. **Answer it.** As the leader of that group, the request is at the top of the same screen. Approve
   puts them on the roster in the same press. Check the group's roster to see it.
7. **Decline.** The answer is kept, and the person sees it on the finder.
8. **Somebody else's group.** A leader is only offered the requests for groups they lead.

**Not built yet:** the email telling them either way. Messaging runs on the church's own provider
(R9.8, HRT-87), so until that lands the finder is where they see the answer. The queue of answers
nobody has sent is already a query, so sending them is the only part left.

### HRT-90, how to test it

From **Groups**, tap a group's name.

1. **The page.** Its kind in the breadcrumb, the name, and a bar saying whether it is open with the
   way to ask beside it.
2. **About.** The group's own description, in full, rather than the three lines the card shows.
3. **Categories.** Day, kind, who it is for, online, children welcome, and where, as chips.
4. **Schedule.** "Meets weekly on Tuesdays, 7:30pm to 9:00pm", written the way somebody says it.
5. **Next meetings.** The next three dates, worked out from the pattern. A fortnightly group skips a
   week. A monthly group stays on the same weekday rather than the same date, because "the first
   Tuesday" is what monthly means to a church.
6. **Last met.** The meetings that were actually recorded, with how many came. A group whose leader
   has recorded nothing shows nothing here, which is the honest answer.
7. **Where.** Tuesday night has an address: it shows, with a directions link that opens a map.
   Welcome team has one too. Membership class has none, and that section is simply absent.
8. **Asking.** Ask to join from this page. The bar changes to Asked, and the request reaches the
   leader on the finder.

### HRT-201, how to test it

The shell. Every staff screen now sits in it, so the thing to look for is a screen that looks wrong
rather than a feature to try.

1. **The sidebar** is down the left on a desktop. The entry for the screen you are on is white with a
   hairline shadow; the rest are grey.
2. **Collapse it** with the button beside the Hearth mark. It becomes a 64px rail of icons. Hover any
   icon and its words appear. Reload: it is still collapsed, because the width is in a cookie and the
   server renders it that way with no flicker.
3. **The top bar** carries the page title and one filled button, the one that belongs to that page.
   On People it is Add person. Import, Celebrations and Print moved down onto the page.
4. **Narrow the window under 768px.** The sidebar goes and five tabs appear along the bottom. The
   page keeps room underneath so its last control is reachable.
5. **Your name and role** sit at the bottom of the sidebar and open Settings. Sign out is underneath
   rather than beside it.
6. **Check-in**: pick a station and the screen goes full screen with no navigation, light palette,
   station density. "Change" brings the shell back.
7. **The member home** (sign in as a member, or open `/home`) runs at portal density inside the same
   shell, with the church's colour under the top bar.
8. **Names match the design.** Directory is now **People**. Add someone is **Add person**. Possible
   duplicates is **Duplicates**. Order of service is **Service plan**. Incident reports is
   **Incidents**. Birthdays and anniversaries is **Celebrations**. Kids classes is **Room rosters**.
   Live is **Live service**. The full table is in docs/redesign/README.md.
9. **Deep screens** still work: a person, a group, a service plan, a team's schedule, a follow-up
   pipeline, a form builder. Each shows its own name in the top bar.

### HRT-149, how to test it

Conditional logic. One condition per question: an earlier answer, a test, a value.

1. On a form, add **Are you new here?** as **Choose one** with the choices Yes and No. Then add
   **How did you hear about us?** and set **Show it when** to that question, **is**, **Yes**.
2. **As it will be read** is answerable now. Pick No: the follow-up is not there. Pick Yes: it
   appears. Switch back to No and it goes again.
3. The row in the builder says **Shown when Are you new here? is Yes** under the question.
4. Put a third question under the second one, waiting on the second one's answer. In the preview it
   appears only when its parent is both shown and answered the right way, so a branch under a branch
   behaves.
5. The tests offered are **is**, **is not**, **is answered** and **is blank**. The last two ask only
   whether anything was put in, so they need no value.
6. **Show it when** only lists questions above this one, and never a heading.
7. A choose-one question's condition offers its choices as a dropdown rather than free text.
8. Move a question above the one it waits on. The row turns red, the banner at the top says a
   question is waiting on an answer nobody has given yet, and **Open it** is refused. Move it back
   and the form opens.
9. Remove the question a condition waited on. The condition comes off and the follow-up is simply
   always shown.
10. A required question inside a hidden branch is not required of somebody who never saw it. Leave
    the branch closed and the form still sends.

### HRT-148, how to test it

The public link is HRT-150 and submissions are HRT-151. This is the writing.

1. **Forms** is in the main navigation for Owner and Admin. **New form** asks for a name and opens
   the builder.
2. **Add a question** offers all nine kinds: short answer, long answer, number, date, choose one,
   choose several, yes or no, a file, and a heading.
3. **As it will be read** underneath shows the form the way its reader will meet it, updating as you
   write. A required question carries the red asterisk there too.
4. A heading can never be required. Tick the box on one and it saves as not required.
5. **Choose one** and **Choose several** ask for choices, one per line. Paste a messy list: blanks
   and duplicates are dropped and the order is kept.
6. **Open it** is refused while the form asks nothing, or while a choice question has no choices. The
   banner says which.
7. Up and down reorder a question. Removing one asks first.
8. **Close it after this many** takes a number, and refuses zero.
9. **Put it away** closes the form as well as archiving it, and it leaves the list. Bringing it back
   restores it as a draft rather than silently reopening.
10. Only Owner and Admin see any of it.

### HRT-89, how to test it

Sign out first, or use a private window. The whole point is that it works with no account.

1. **/g/<your church slug>**, for example `/g/riverside`. The church's groups, with its own colour
   across the top.
2. Only groups marked listed appear. Unlist one in the app and reload: it is gone. Archive one: gone.
3. A card opens **/g/<slug>/<group id>**, which a church can link to directly from its own site.
4. What is published: the name, what it is, when and where, who it is for, roughly how big it is, and
   whether it is taking people. No leader names and no roster. Naming a volunteer on the open web is
   a different act from naming them inside the church, and not one a church asked for.
5. A church nobody has looked at yet publishes nothing at all, the same rule as its join link. A slug
   that names nothing is a 404, and so is a demo church.
6. The picture from HRT-88 shows here too, through a link signed for an hour.

### HRT-88, how to test it

1. Open a group. **Add a picture** takes PNG, JPEG or WebP up to 5 MB, through the same upload path
   as everything else, so the type, the size and the quota are all checked before a byte is written.
2. The picture sits across the top of the card in the group finder, which is what it is for: a
   photograph of eight people round a table says what a paragraph cannot.
3. **Settings → Church** shows the storage bar move.
4. Replace the picture four times. The bar does not move four times: the old file is forgotten from
   the ledger and deleted from the bucket, so four tries cost one picture.
5. **Remove** takes it off the group and out of the bucket.
6. A PDF is refused, and so is anything over 5 MB.
7. Only whoever can change the groups sees the buttons. Everybody else sees the picture.
8. The bucket is private, so every picture is served through a link signed for an hour.

### HRT-43, how to test it

Change the colour in **Settings → Church** first. Twelve hues, matched for lightness and chroma, so
one can be swapped for another without anybody rechecking contrast.

1. A rule in that colour across the top of the surfaces a church hands something out on: the
   member's home, the printed directory, the printed order of service, the printed room roster, and
   the page a volunteer opens from a serving request.
2. Not on the admin screens. There the person is working in the software rather than receiving
   something from the church, and a repainted interface would be decoration.
3. Open a serving request link signed out. It carries the church's colour, which is the one branded
   surface with no session behind it.
4. Change the colour and reload. Everything follows, including the link already sent out.
5. The printed rule survives printing: it is sized in millimetres for the sheet.

Also fixed here: the team colour dot on the order of service referred to `--hue-teal`, which is not
a token. The shades are `-100`, `-500`, `-700`, `-900`. It was showing nothing.

### HRT-122, how to test it

1. **/trust** opens signed out, linked from the foot of the landing page. A church decides whether to
   trust us before it has an account, so a page behind a sign-in cannot answer the question.
2. Five promises, each saying what holds us to it rather than asserting it: the licence, an export we
   depend on ourselves, a test that fails the build, ninety days of notice, giving that never passes
   through us.
3. **Who else touches your records** names Supabase, Vercel and Stripe, and what each does.
4. The structural half has no screen. `packages/db/tests/no-model-training.test.ts` fails the build
   if any package whose purpose is calling a model appears in any manifest, or if any model endpoint
   appears anywhere in the source. Add `openai` to a package.json and watch it fail, then take it out.
5. It also checks the promise is still on the trust page, so the page cannot quietly drift from the
   rule the test enforces.

### HRT-121, how to test it

The deliverable is the drill, not the backup setting: an untested backup is not a backup. The
runbook is [docs/backup-and-restore.md](docs/backup-and-restore.md).

1. `pnpm --filter @hearth/db census riverside` counts every row of every table that church holds,
   biggest first.
2. `--out before.json` writes it. `--against before.json` compares a fresh census with it, exits 0
   when every table matches and 1 when it does not, naming the table.
3. Change one thing and run it again. It says which table and whether the count or the rows
   themselves differ: the digest catches the right number of the wrong rows.
4. Tables are found by looking for a `tenant_id`, so a table added next quarter is in the next drill
   without anybody remembering it.
5. The runbook has the restore steps, the drill log, and the two things it does not cover.

Nothing writes while a census runs, including the test suite. Several suites mutate the seeded
development churches, so a census taken during a test run will disagree with itself.

**Point-in-time recovery is a paid Supabase add-on** and is not on yet. That is the one call here
that costs money and is yours to make. The runbook argues for keeping it on and says why.

### HRT-115, how to test it

Create a church from the sign-up form. Every church that existed before this story was approved when
the migration ran, so your own church is unaffected.

1. A new church carries a banner on every page saying it is being checked, with how many of its 25
   people it holds.
2. It works completely otherwise: add people, services, groups, teams, run a check-in.
3. **Settings → Team**: the join link is refused, and so is inviting anybody. Both say the same
   thing, that it opens once somebody has looked at it.
4. Add people up to 25. The twenty-sixth is refused, and an import that would go past it in one go
   is refused as a whole rather than half-landing.
5. `pnpm --filter @hearth/db approve` lists what is waiting: the church, who made it, how many
   people, how old it is.
6. `pnpm --filter @hearth/db approve <slug> <your name>` approves it. Reload: the banner is gone, the
   cap is gone, the join link works and invitations send.
7. `pnpm --filter @hearth/db approve --revoke <slug>` puts it back, and the join code already handed
   out stops working.

### HRT-111, how to test it

The UI is single-campus on purpose. There is no campus picker anywhere, and there should not be.

1. **Settings → Church** has **Where you meet**: the campus name, and the places inside it.
2. Rename the campus. It saves when the field loses focus and carries the red asterisk.
3. **Add a place** names one: "The Hall", "The Annexe". Extra spaces are collapsed, a duplicate name
   is refused, and the pencil renames one.
4. **Delete** asks first and says that anything recorded as meeting there keeps its own words.
5. Only Owner and Admin see the buttons. Anybody else sees the list.
6. The part with no screen: add a person, a service or a group, and the record carries the campus
   without anybody choosing one. A database trigger fills it, so the importer and the seed script
   get it too. Records written before this story were backfilled when the migration ran.

### HRT-134, how to test it

1. **History** sits at the foot of the order of service, newest first.
2. Add an item. It reads "Added <title>". Take one off and it still names it.
3. Change an item's length and it reads "Changed the length on <title>", naming only what moved.
4. Fill in the series and the theme and it reads against the plan itself.
5. Add a note and it is listed by the note's first words.
6. Each line carries who did it and when. A church member with no name on their account shows their
   role instead.
7. Run the gathering through live mode, then reload. The history is the same length it was, because
   advancing through twenty items would otherwise bury every real change.

### HRT-133, how to test it

Open it on two devices, signed in as the leader on one and as a member on the other.

1. **Live mode** is on the service's More menu in the calendar, and at the top of the order of
   service.
2. **Start** puts the gathering on the first item. The leader sees Back, Next and End. The member
   sees the same screen with no buttons.
3. The current item is the largest thing on the screen, the next one under it, with the item clock
   counting up and the whole gathering's drift beside it. Running past an item's planned length
   turns the clock red, and running late turns the drift red.
4. **Next** on the leader's device moves the member's device within a few seconds.
5. Pressing an item in the list below jumps straight to it, for when the order changes on the floor.
   A member pressing it does nothing.
6. **Back** at the first item stays there. **Next** at the last item ends the gathering.
7. **End** clears it. Reopening reads Not started, and the plan still has every item on it.
8. Starting a plan with nothing on it is refused.

### HRT-132, how to test it

1. **Print** on the order of service offers two versions, each opening in a new tab on the printer
   dialog.
2. **The full order** is what the team runs from: the clock down the left, the kind and the
   description under each title, the notes with who they are for, the minutes down the right, the
   time it ends, and Who serves at the foot with each position and who is in it.
3. A declined request is left off the printed roster, because the sheet is a list of who is there.
4. **For the bulletin** is the titles in order, under the service name, the date, the series and the
   theme. No times, no minutes, no notes, no roster.
5. Both come out with no browser header or footer across the page, so there is no URL printed on the
   sheet handed out.
6. Print is disabled while the plan is empty, and the pages are refused to anybody below Staff.

### HRT-131, how to test it

1. **Who serves** sits under the order of service, listing each team that has a position to fill,
   with the team's colour beside its name.
2. Each position reads filled of needed, in red while it is short, and the card header counts how
   many are still wanted across the whole gathering.
3. The plus against a position offers the team's roster, whoever plays that position first, with
   away and due-a-break warnings the same as the serving screen.
4. Somebody put down here shows as Pending and appears on their own serving list. The chain icon
   copies the same answer link.
5. Open that link and accept. The plan reads Accepted. Decline instead, and the position reads
   short again while the declined name stays, so the leader knows it was asked and answered.
6. Taking somebody off here takes them off the serving schedule too.

### HRT-130, how to test it

Have a plan with a few items on an earlier service first, so there is something to copy.

1. **Start from** on the order of service lists earlier plans, newest first, with the number of
   items and the minutes beside each. Picking one adds its items to this plan.
2. What comes over is the kind, the title, the length and the order. The description, the notes and
   the files stay with the week they were written for.
3. The plan copied from is untouched. Its notes and files are still on it.
4. Copying again adds another set after the first, so nothing already on the plan is lost.
5. **Save as a template** names this plan's shape. It then appears under Templates in the same
   **Start from** menu, and applying it does the same thing.
6. Saving again under a name already used replaces that template rather than making a second one.
7. The dialog lists the saved templates, each with a pencil to rename and a bin to delete. Deleting
   leaves the plans built from it alone.
8. A blank template name is refused, and so is saving an empty plan as a template.
9. Only Owner, Admin and Staff see any of it.

### HRT-129, how to test it

1. The paperclip against an item attaches a file. PDFs, images, mp3, m4a, ogg, wav and plain text.
2. It appears as a chip under the item. Pressing it opens the file in a new tab through a link
   signed for an hour, because the bucket is private.
3. Video is refused, and so is anything over 10 MB. Settings → Church shows the storage bar moving.
4. The x on a chip removes the file from the item, from the ledger and from the bucket, so a church
   is not paying quota for something nothing points at.
5. Attaching the same file twice to one item is refused.
6. Only Owner, Admin and Staff can attach.

### HRT-128, how to test it

Schedule a few people onto the service first. The audience for a note is read from the schedule, so
a position nobody is filling is not offered.

1. On the order of service, the speech-bubble icon against an item writes a note.
2. **Who it is for** offers Everybody, each team on the schedule, each position being filled, and
   each person scheduled, with what they are doing beside their name.
3. The note appears under the item, with the audience in bold ahead of it.
4. A note addressed to a position carries its team too, so the drummer's note is also worship's.
5. Swap who is playing drums. The note follows the position, so it is the new drummer's.
6. A blank note is refused, and the field carries the asterisk.
7. The x against a note takes it off.

### HRT-127, how to test it

On **Services**, press **More** against any service and choose **Order of service**. A past service
also has it on its own page, beside the roster.

1. The plan is created when you open it. A service you never open has none, which keeps a year of
   generated services out of every list and every export.
2. **Add an item**: a kind, how many minutes, what it is, and a description.
3. Every item shows the clock time it starts at, counted from the service's own start. The heading
   says what time the plan ends and how many minutes it runs.
4. Change the sermon from 25 to 35 minutes. Everything below it moves, and the end time moves with
   it.
5. The arrows move an item up and down, and the clock follows. They are disabled at the ends.
6. An item can be 0 minutes, for a line on the page that takes no time.
7. **Series** and **Theme** save when you leave the field.
8. A plan that runs past midnight reads 00:30 rather than 24:30.
9. Only Owner, Admin and Staff can open it. Anyone else lands back on the service.

### HRT-124, how to test it

1. On a schedule plan, each person down for a position has a link icon beside their name. Press it
   and the answer link is on your clipboard.
2. Open that link in a private window. It needs no sign-in: the church's name, the service, the team
   and the position, and two buttons.
3. **Yes, I can** records it, and the schedule plan shows an **Accepted** badge. An unanswered
   person reads **Pending**, and the Serving list counts accepted, pending and declined per team.
4. **No, I cannot** asks why and does not insist. The schedule plan shows **Declined**.
5. **Change my answer** goes back to the two buttons, because somebody who said yes on Monday and is
   ill on Thursday has to be able to say so.
6. Change a character in the link: "That link is not valid any more". It says nothing about the
   church or the person.
7. A link for a service that has already happened says so and takes no answer.

### HRT-80, how to test it

Open a team and press **Schedule plan**. Generate a service calendar first if there is none.

1. A **Service** dropdown holds the next six services from today, and the soonest is chosen. Pick
   one and the page plans that one. The choice is in the URL, so the link can be sent on.
2. The chosen service lists the team's positions with "0 of 2" against them, red until the position
   is full.
3. Press **+** on a position. It lists the team's roster, with whoever is marked as playing that
   position first, and a **Plays this** badge against them.
4. Put somebody down. The count goes up and their name sits against the position.
5. Put the same person on another team at the same gathering. It goes through. The dialog says
   "Also on Worship, Keys" under their name, because a leader wants to know where somebody is, and
   serving in two places at one hour is a thing small churches do.
6. That note only appears for a gathering at the same hour on the same day.
7. On a person's record, the **Serving** card now carries **Coming up**, **How often they serve**
   and **Days away**. Add days away covering a gathering, then open the schedule for it: that person
   carries "Away" in the dialog.
8. Set how often they serve to monthly, put them on a gathering, then open a gathering a week later.
   They carry "Served 2027-03-07, asked for Monthly". Set it to weekly and the warning is gone.
9. **Take off** empties the slot and the count drops.
10. A team leader can build the schedule of the team they lead, and gets the same warnings.

### HRT-79, how to test it

**Serving** is in the header. Your church already has five teams, because they came with it.

1. Worship, Production, Welcome, Ushers and Children, each with the positions it schedules. The
   Children card says a background check is required; Production's does not.
2. Open **Children**. Room leader and Helper are marked as working with children and asking for a
   check. Check-in desk is marked as neither.
3. Add a position. Tick **Works with children** and the check box ticks itself. You can untick it,
   which is the church's call.
4. A position name has to be new on that team. "Keys" is taken on Worship and free on Production.
5. Under **Who serves**, type two letters of a name and press the person. They go on the team.
   Press **Positions** against them and tick what they play.
6. **Take off the team** removes them from the list. The row they left behind keeps the date, so
   who was on the sound desk last year stays answerable.
7. Archive a position you added. It comes off the team and off everybody who played it.
8. Open that person's record. A **Serving** card sits above Lists, naming every team they are on,
   the ones they lead, and the positions they play.
9. **Sign in as a team leader** whose record is linked to an account and who is marked Leader on
   one team. They get a Serving link, see only that team, can change its roster, and cannot create
   a team or touch another one. Opening another team's page sends them back to the list.
10. The directory a team leader sees is their own team, the same way a group leader sees their own
    group.

### HRT-27, how to test it

**Birthdays** is a button at the top of the directory, beside Import.

1. It opens on this month. Two tiles count the birthdays and the anniversaries in it.
2. The arrows move a month at a time. **Week** switches to seven days and the arrows move a week at
   a time. **This month** and **This week** come back to today.
3. The age is the one they reach on the day, so somebody born in 1984 reads 42 in October 2026 and
   47 when you page forward to October 2031.
4. An anniversary comes off the marriage milestone. Record one on a husband and the same date on his
   wife, with a spouse relationship between them, and they appear on one row, as "Hana and Idris".
   Record one on somebody whose spouse the church has no record of and they appear alone.
5. Put a birthday on 29 February. In a leap year it reads 29 February. In any other year it reads
   28 February, so the person is still on February's list.
6. Page to a week that crosses new year, such as 28 December. A birthday on 30 December and one on
   2 January are both on it, dated in their own years.
7. Archive somebody with a birthday this month. They come off the list.
8. The whole window is in the URL, so the October list can be sent to whoever writes the cards.

### HRT-120, how to test it

Open anybody's record. **History** sits above Notes.

1. Everything in one order, newest first: added to the church, services they were at, classes a
   child was checked into, groups joined and left, milestones, notes, pipelines entered and
   finished, follow-ups answered, background checks.
2. Joining a group and leaving it are two entries on their own days.
3. The dot carries the colour the group or pipeline already has elsewhere.
4. **Sign in as staff.** The confidential note is gone from the list rather than greyed out: a
   greyed row still tells the office that a confidential note about this person exists. Background
   checks are gone too.
5. Opening the history as Owner or Pastoral writes an audit entry for each confidential note read,
   the same as opening the note itself does.

Giving, serving and communications are not built yet. Each is another block in `timeline.ts` when
it lands.

### HRT-119, how to test it

Directory, the search box. One box, so type whatever you remember.

1. **Part of a surname**, part of an email, or the digits of a phone number with the punctuation
   left out: "5550148" finds "(512) 555-0148".
2. **A street, a town or a postcode** now finds the people who live there, including everybody in
   the household the address belongs to. That is new.
3. **A first name and surname typed together** still works.
4. Nothing matching returns nothing, as quickly.

The budget is the database's own time on the query, measured with EXPLAIN ANALYZE against a church
of five thousand people. It was 1,871ms and is 105ms.

### HRT-117, how to test it

Directory, tick two people, **Merge**.

1. Put one of them in a group first. After the merge the survivor is on the roster with the role the
   other one held, and the archived record is off it.
2. Enter one of them into a pipeline and write a task about them. Both end up on the survivor.
3. Where both were already live in the same group, one row survives rather than two.
4. Where the survivor had left that group before, the other one's membership still moves.
5. Undo the merge from the merge list. Everything goes back to who had it.

### HRT-112, how to test it

At the check-in desk, open a household and tick a child. A **Bag label** box appears beside their
class, and only while they are being checked in, because a bag label with no child to match it
against is a label nobody wants.

1. **Tick it and check them in.** Three labels print for that child rather than two: theirs, the
   pickup one, and the bag, all carrying the same code.
2. **The bag label has no allergy on it.** A bag gets left in a corridor, on a pew and in a car, and
   a child's medical note should not be in any of those places. The child's own label still carries
   it.
3. **Reprint the labels.** The bag label comes back, because the choice is on the visit rather than
   decided at print time.
4. **An adult never gets one**, even if something asks for it: a badge says who somebody is and
   makes no claim on a child, so there is nothing to match a bag against.
5. **Offline.** Pull the network, check a child in with the box ticked, and the bag label prints from
   what the station is holding. It reconciles with the choice intact.

The kiosk does not ask. It is one more decision in a queue of forty families, and the volunteer at
the desk is the one who prints it when a bag actually turns up.

### HRT-110, how to test it

Two kinds, and the difference is the point. A picked list stays exactly who was picked. A rule list
is the directory's filters, stored, and answers itself next month.

1. **A list that answers itself.** In the directory, filter down to visitors with no email. "Save as
   a list" appears under the filters. Name it. It opens, and it is in the sidebar under Lists.
2. **It moves.** Give one of those people an email address and open the list again. They are gone,
   with nobody maintaining anything.
3. **A list somebody picked.** Tick four people and use "Add to a list" in the selection bar. Make a
   new one, or add them to one you already have.
4. **It does not move.** Change one of their statuses and open the list. They are still on it.
5. **Taking somebody off** appears in the selection bar only while a picked list is open, and it
   leaves their record alone.
6. **Rename and archive** are on the bar at the top of an open list. Archiving takes the list off the
   sidebar and touches nobody on it.
7. **Export.** With a list open, the export button gives you that list, not the whole church.
8. **A person's record** shows the picked lists they are on, each one a link back.

A rule list offers no way to put somebody on it by hand, and no count in the sidebar, because the
answer is read when it is opened.

### HRT-116, how to test it

`groups-sample.csv` is in the scratchpad. Import `planning-center-sample.csv` first so the people
exist, then import the group file through the same three steps.

1. **It knows what it is.** The matching step says Group memberships, matches the columns against
   group fields, and the question about duplicates is gone, because a membership row joins a group
   or it does not.
2. **The check** says how many people will be added and which groups will be created, by name.
3. **It creates Tuesday Night and Welcome Team**, puts Maria in as leader, Carlos as a member, Dave
   as a co-leader, and keeps the date each of them joined.
4. **The row for somebody not in the directory fails** and says so, rather than making a person up.
   Two people of one name with no address between them fails the same way: the wrong Sarah in a
   small group is a mistake a church will not notice and cannot see.
5. **Undo it** from the import history. The people come back out of their groups, and the groups it
   created are removed. Join one of them yourself first and that group is kept.

### HRT-102, how to test it

Three sample files are in the scratchpad: `planning-center-sample.csv`, `breeze-sample.csv`,
`churchtrac-sample.csv`. Import, choose one, and the matching step says which system it came from
and has every column already matched.

1. **Planning Center.** Membership becomes the status, and Status is left out, because Status is
   active or inactive and reading it as lifecycle turns every inactive person into a visitor. Mobile
   Phone is taken, Home Phone is left, Created At is dropped.
2. **Breeze.** Family and Family Role become the household and the role in it, Joined Date becomes
   the membership date, and Breeze ID is dropped.
3. **ChurchTrac.** Headers with no spaces at all, so FamilyPosition has to land on the household
   role.
4. **A spreadsheet somebody typed** gets no badge and the ordinary guess, as before.
5. **A column none of them know about** stays unmapped rather than being guessed into a field.

Giving history is R19.6 and belongs to 0.3. Group membership files are HRT-116.

### HRT-114, how to test it

Each church on this machine has a code. Riverside's is **8MWT-P8VE**, at `/join/8MWTP8VE`.
Settings, Team shows it, with the link, a new code, and a switch to turn it off.

1. **Anybody holding the link is in.** Open it in a private window, create an account with any
   address, and you land on the member home. Nobody approves anything: the code is the gate.
2. **An address the church already has** claims that record, so they arrive as themselves with their
   household and groups already attached.
3. **Any other address** gets a visitor record written there and then, named from what they typed,
   with their email on it. The church merges it later (R2.8) if it turns out to be somebody it
   already had.
4. **A child's record is never claimed**, and neither is one somebody else already holds. Both get
   their own new record.
5. **An address that already has an account** is sent to sign in, with the address filled in, the
   password tab open and the way back in underneath it.
6. **The code.** Take a new code and the old link stops working. Turn joining off and it stops for
   everybody.

### HRT-109, how to test it

Sign out. From the front page, **Start a church**.

1. **Create your account.** Name, email, password of at least ten characters. Nothing exists until
   the link in the email is opened: an invitation is matched to a verified address, and a church's
   first owner is granted to one, so the address has to be proved before it is worth anything.
2. **Then the church.** The link lands on creating a church, and you are its owner.
3. **I have forgotten my password**, on the password tab. The answer is the same whether or not the
   address has an account, so it cannot be used to find out who has one.
4. **Choosing a new one** happens on a screen the link opens, and sends you back to sign in with it.
5. **Settings, Security.** Changing a password asks for the current one, and checks it by signing in
   with it. Supabase will change a password on an open session without asking, and an open session
   on a shared church laptop is the case this has to refuse.
6. **Somebody who has only ever used email links** has no current password to give, so they ask for
   a link instead.

### HRT-107, how to test it

`pnpm --filter @hearth/db metrics`, against the real database.

1. **Every church, and how long it took** from signing up to a directory somebody can use: a
   committed import, or twenty-five people entered by hand, whichever came first.
2. **Twenty-five** because a church of fifty to five hundred with twenty-five people in it has
   stopped evaluating and started using it. One person typed in while looking around has not.
3. **It is derived.** Roll an import back and the church stops being counted as having got there.
   Nothing is written at the moment it happens by code that might not run.
4. **The median and the share inside the hour**, which is the number the sixty-minute target is
   actually about. The average would be moved by one church that signed up and came back in March.

### HRT-106, how to test it

The **?** beside your name, on any screen.

1. **It opens on where you are.** Check-in explains check-in, Kids classes explains the classes, and
   everything else is under it.
2. **Search** across all of it.
3. **It is behind a button.** A product that explains itself on the page shouts at the ninety-nine
   people who already knew, which is why there is no hint text under any field in Hearth.
4. **The articles are in the catalogue** like every other string, so they are translated with the
   product rather than left in a wiki somebody forgets.

### HRT-105 and HRT-108, how to test them

**Settings**, then **Set up**. On the staff directory there is a line at the top until it is done or
put away.

1. **Five steps**, each linking to the screen that does it rather than wrapping that screen in a
   wizard. A church that adds a service time here and another next March is in the same place both
   times, and learning where things are is most of what the first hour is for.
2. **Nothing is stored about your progress.** Add a service time and the step is done. Remove it and
   the step is open again. A wizard that keeps its own tally congratulates a church on importing
   nobody.
3. **Not for us.** A church with no kids' classes says so, and the step settles without pretending
   it was done. It is undone from the same button.
4. **Put this away** hides the line on the directory. Settings brings it back.
5. **Who can get in** is a new screen, Settings then that name. Invite somebody by the address they
   will sign in with, choose what they may do, withdraw an invitation, change somebody's role, or
   take their access away. Their person record in the church is untouched by any of it.
6. **The last owner** cannot be demoted or removed, by this screen or any other path. A church with
   no owner is a church nobody can administer.

### HRT-99 and HRT-100, how to test them

**Settings**, then **Printed directory**, is what the church may print about you. On the staff
**Directory**, **Print the directory** opens the book.

**A member has one screen and no section bar.** Signing in as `member@riverside.example.org` lands
on it: hello, and the groups they are in with a way to find another. Staff keep the sections they
work in. A row of links to screens somebody cannot open is how a church ends up
with a product nobody opens, and the portal in 1.0 (R17) grows from this screen rather than from a
cut-down copy of the staff app.

1. **The default is your name.** Everybody is listed, and nothing else of anybody appears. A church
   that imported two hundred phone numbers has been given permission by none of those two hundred
   people, so the absence of a choice means the safest answer.
2. **Turn a field on.** Your email, your phone, your address, your birthday. It appears in the
   directory for everybody and the fields you left off do not.
3. **The acceptance criterion.** Hide your address. You still see it on your own record, and it is
   nowhere in the directory. It will be nowhere in the printed one either, because both read the
   same rule.
4. **Take yourself out.** One tick, and you are absent from the directory and still in the church's
   records.
5. **Children.** A child never appears until the head of their household ticks "Our children, by
   name", and never appears with contact details even then. Tick everything on the parent's record
   and the child still has no email, no phone and no birthday against them.
6. **Somebody rings up and asks.** Owner, admin and staff can change somebody's setting for them.
   Another member cannot.
7. **Search.** By a person or by a household: "Bennett" finds the Bennetts.

Photos are in the model and nowhere on the screen, because a person's photo cannot be uploaded yet.
That is R2.x and the quota work behind it.

### HRT-26, how to test it

Open anybody in the **Directory**. **Background check** is in the right column, for owner, admin and
pastoral only. Sign in as staff and the card is not there.

1. **Record one.** Who did it, what it said, the day it was completed, the day it runs out.
2. **Where they stand** is worked out rather than stored: Clear, Running out, Run out, Flagged,
   Waiting, Not checked. Run out and Not checked are deliberately different answers, because
   "nobody has checked her" and "hers lapsed in March" are two different conversations.
3. **Running out** starts sixty days before the date, and the volunteer keeps serving through it. A
   church that stops somebody eight weeks early has lost a volunteer and gained nothing.
4. **Record another.** The new one decides. The old one stays on the list. There is no edit and no
   delete anywhere on this card: what the church knew in 2024 has to stay answerable in 2030.
5. **A flagged check** stands until a later check supersedes it, and never quietly expires into
   "not checked".
6. **What is not kept.** No report, no finding, no notes. The provider holds that. A test asserts
   the table has only the eight columns it should have.

The gate itself, where somebody without a check cannot be scheduled with children, is R10.9 in 0.4.
The rule it will call is written and tested here.

### HRT-97, how to test it

**Settings**, then **Follow-ups**. Owner and admin, because this is the process rather than the work.

1. **Rename one.** Call Serving "Getting involved" and say what it is for in your own words. The
   finder, the queue and the board all say it.
2. **Rewrite the steps.** Change what a step says, change how many days it gets, add one, remove
   one. The order you leave them in is the order they are written out in.
3. **Lands on.** Choose who new follow-ups from this pipeline go to. A trigger that fires at
   midnight then has somebody's name against it rather than nobody's.
4. **People already in it are untouched.** Somebody halfway through keeps the steps written out for
   them. A church that rewords a step should not lose the three people it is already calling.
5. **Turn one off.** Nobody new enters it, by hand or by a trigger. The people in it stay.
6. **What you cannot do.** Make a seventh. Draw a branch. Add a condition. That is R5.8, deferred
   to 1.x, and it is the feature that makes the free competition unusable by a volunteer.

### HRT-96, how to test it

**Follow-ups**, then **Across the church**.

1. **A tile per pipeline**, in its own colour, with how many are in it as the number. Late shows in
   red beside it, and the longest wait underneath. Three numbers, because a pastor looking at this
   is asking where the church is dropping people.
2. **Open a tile.** Who is in it, longest wait first, with their next step and the day it is due.
   The number is only useful if it opens into names: somebody has been in First visit for five
   weeks, and that is a person rather than a statistic.
3. **Late in red**, there too.
4. **A name** goes to their record.

### HRT-95, how to test it

**Follow-ups** in the header, for owner, admin, staff and pastoral.

1. **Three groups, no filters.** Late, This week, Later. Somebody opening this on a Monday morning
   wants to know what they have already missed, and a dropdown does not answer that.
2. **Late is red** and sits at the top.
3. **The row** names the person, links to their record, and carries the pipeline in its own colour,
   so working a queue of twenty does not mean guessing which is which.
4. **Done** asks what happened, from here, without opening the person.
5. **Nobody has these.** A step raised by a trigger and given to no one. Take it and it moves into
   your queue, which is how a volunteer picks work up.
6. **A pastoral account lands here** after signing in. It is the one role whose job is the
   follow-ups rather than the records.

### HRT-94, how to test it

Nothing to press. Record attendance and the follow-ups raise themselves.

1. **A first visit.** Mark a **visitor** present on a service. Open their record: First visit is
   open, dated the day they came, with the first step due two days later. That is the acceptance
   criterion, and the sweep runs off the back of the attendance write.
2. **Members are left alone.** Mark a member present and nothing happens. A church of two hundred
   that starts using Hearth on a Sunday is not two hundred first-time visitors. The record began
   that day; they did not.
3. **A second visit.** Mark the same visitor present on a later service. Second visit opens
   alongside, dated that Sunday.
4. **Twice is still once.** Mark attendance again. Nothing new appears, today or tomorrow.
5. **Closed stays closed.** Close First visit and record more attendance. It does not come back.
6. **Three missed.** Somebody who was coming and has missed three held services in a row raises Not
   seen for a while. Cancelled services do not count, so a Sunday called off for snow does not
   accuse half the church of drifting. The number is the church's own (Settings, absence threshold).
7. **One spell, one follow-up.** It is raised once however long they stay away. If they come back
   and drift again, it raises again.
8. **A milestone.** Add a **Baptism** milestone and the Baptism pipeline opens with its steps. A
   membership class does the same. A marriage does not: there is no pipeline behind it.

The sweep runs at most once a minute per church, off the attendance write. When the job queue lands
it moves there unchanged.

### HRT-93, how to test it

Open anybody in the **Directory**. There is a **Follow-up** card under their details, for owner,
admin, staff and pastoral.

1. **Start one.** Choose **First visit** and press Start. Three steps appear, dated: say thank you
   in two days, call them in a week, invite them to something in three. The dates are worked out
   from the day you started, so nobody types a date.
2. **The six.** First visit, Second visit, Not seen for a while, Baptism, Membership, Serving. That
   is the list, deliberately. A church cannot invent a seventh, which is what keeps this usable.
3. **Answer a step.** Done asks what happened, and that sentence stays on the record. Six months
   later "we called her and she is coming to the Tuesday group" is the thing worth having.
4. **Overdue.** A step past its day shows its date in red.
5. **Undo.** Ticking the wrong line is undone, and the pipeline opens again if it had closed.
6. **The last step closes it.** Answer all three and the whole thing drops to Closed, marked Done.
7. **Close it early.** Close asks why, and keeps the reason. "Where did the eleven people in this
   stage go" is the question this answers.
8. **Twice.** Start First visit again on the same person while it is open. Nothing happens, by
   design: somebody who visits twice in a fortnight is one visitor.
9. **A task on its own.** Add a task writes a thing to do with a due date and no pipeline.

Nothing enters a pipeline by itself yet. That is HRT-94: first attendance, second attendance, and
three absences in a row.

### HRT-91, how to test it

**Groups** in the header. There is one groups screen now, where there were two.

1. **The list.** The church's groups, under their kinds, with the filters: a box to type in, the
   kind, the night, who it is for, online, children welcome. What used to be behind "Find a group".
2. **Create a group.** Still the first thing on the screen, for an owner, admin or staff. A member
   browsing does not see it.
3. **Unlisted.** Tick off "Listed for members" on a group. It stays on your screen with an Unlisted
   chip against it, and it is gone from a member's.
4. **Archived.** Archive a group from its page. It drops to the Archived line at the bottom of the
   list, with Restore.
5. **The group.** Tap a name. The page from HRT-90, and under it the roster, the register, Edit and
   Archive, for whoever runs groups. A member sees the page without that half.
6. **Requests.** A leader's waiting requests are still at the top of the list.

### HRT-92, dropped, and why

Built and taken out the same day. It put a Resend API key, an SMTP server and a port on a settings
screen, for Maria to fill in. Four hours a week, one volunteer, and we asked her for a port number.

The provider still has to exist, because messaging runs on the church's own account (R16.2) and
that is settled. It gets set up with the church during onboarding (F22), by somebody who does this
for a living, out of the volunteer's way. Where that configuration is written down is part of
onboarding's design, so it is decided there.

**HRT-87** group messaging waits on that. The queue of people a message is owed is already a query,
so the sending is the only part missing.
