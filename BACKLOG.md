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
| HRT-1 | Platform-neutral tokens, generated to CSS, three density modes | R24.1 to R24.3 | Closed |
| HRT-2 | Colour spectrum, hues assigned to things rather than sprinkled | R24.4 | Closed |
| HRT-3 | Component library, every state, both themes, all three densities | R24.6 | Closed |
| HRT-4 | The `/design` gallery, eight pages | R24.8 | Closed |
| HRT-5 | Replace native browser validation with our own field messages | R24.6 | Closed |
| HRT-6 | Dark-mode status colours, and stop tinting invalid inputs | R24.5 | Closed |

### F1. Tenancy, roles and administration

| ID | Story | Req | State |
|---|---|---|---|
| HRT-7 | Supabase Postgres, 21 tables, row-level security on every one | R1.3 | Closed |
| HRT-8 | Roles with field-level permissions enforced at the query layer | R1.4, R1.5 | Closed |
| HRT-9 | Append-only audit log written by database trigger | R1.11 | Closed |
| HRT-10 | Adversarial isolation suite, cross-tenant reads and writes on every table | R1.3 | Closed |
| HRT-11 | Sign-in, membership-verified sessions, invitations | R1.7 | Closed |
| HRT-12 | Database hardening: pinned search paths, no PostgREST reachability | R21.x | Closed |
| HRT-13 | TOTP multi-factor, mandatory for Owner, Admin and Finance | R1.8 | Deferred to later in 0.1, product surface first |
| HRT-14 | Active session list with remote revoke | R1.10 | New |
| HRT-15 | Church profile settings: name, address, timezone, service times, logo | R1.1 | New |
| HRT-32 | Create a church and its first Owner from sign-up. A church is a `tenants` row. | R1.1, R22.1 | New |
| HRT-16 | Custom field definitions and values, in the UI | R1.12 | New |
| HRT-17 | Tag management, assignment, and merge, in the UI | R1.13 | New |
| HRT-18 | Storage quota display with a warning at 80% | R1.16 | New |

### F2. People

| ID | Story | Req | State |
|---|---|---|---|
| HRT-19 | People and households, read-only directory | R2.1, R2.2 | Closed |
| HRT-20 | Notes in two classes, confidential ones encrypted and separately gated | R2.7 | Closed |
| HRT-21 | **Add, edit and archive a person. Households and contact methods.** | R2.1 to R2.3, R2.5, R2.13 | Resolved |
| HRT-22 | Relationships, independent of household | R2.4 | New |
| HRT-23 | Milestones, with the extensible kind list | R2.6 | New |
| HRT-24 | Duplicate detection and merge, reversible for 30 days | R2.8 | New |
| HRT-25 | Bulk edit across a selection | R2.12 | New |
| HRT-26 | Background check status and expiry tracking | R2.10 | New |
| HRT-27 | Birthdays and anniversaries list | R2.9 | New |

### F19. Data portability

| ID | Story | Req | State |
|---|---|---|---|
| HRT-28 | CSV and Excel import wizard: column mapping, dry run, duplicate handling | R19.1 to R19.3 | New |
| HRT-29 | Import rollback, reversible for 30 days | R19.4 | New |
| HRT-30 | Complete export of every entity, open formats, no gate | R19.8 | New |
| HRT-31 | Sample and demo data | R19.7 | New |
| HRT-33 | Seed and gallery names to US names, since US churches come first | R19.7 | Resolved |

---

## E2. Sunday Core (0.2)

The first release real churches run. Stories are written at the start of the release, not now.
Features in scope: F3 Directory, F5 Follow-up, F7 Attendance, **F8 Check-in**, F9 Groups,
F22 Onboarding, plus the Planning Center, Breeze and ChurchTrac importers (R19.5).

F8 is safety-critical. Its stories get acceptance criteria written before any code, including the
offline case, because a defect there can cause physical harm to a child.

## E3. Money (0.3)

F13 Giving. Stripe Connect at a zero platform fee, batch entry with dual control, IRS Publication
1771 statements, QuickBooks export.

## E4. Service Ops (0.4)

F11 Service planning and F12 the song library, which is the Phase 2 spine, plus F10 volunteers.

## E5. GA (1.0)

F4 Forms, F6 Pastoral care, F14 Events, F15 Calendar, F16 Communication, F17 Portal,
F18 Reporting, F20 API.

## E6. Hearth Stage (P2)

The presenter. Separate PRD written at build time.

---

## Now

| | |
|---|---|
| **Active** | Nothing |
| **Waiting on a test** | **HRT-21**, add, edit and archive a person. **HRT-33**, US names in the seed data. |
| **Next** | HRT-17 tags, then HRT-16 custom fields, then HRT-32 create a church, then HRT-28 import |

### HRT-21, how to test it

Sign in as `pastor@riverside.example.org` and open the directory.

1. **Add someone.** Press "Add someone". Submit it empty: the messages appear under the fields, not
   in a browser bubble, and focus lands on the first name. Fill in a name only and save. That is the
   whole requirement, one name and nothing else.
2. **The dates.** Put a date of birth in 2032 and save. It is refused before it reaches the server.
3. **A household.** Edit that person, choose "Start a new household", name it, save. Reopen the
   edit form and the household is selected. Move them to a different household and the old
   membership is ended rather than erased.
4. **Archive.** Archive them. The dialog says what happens and what does not. They leave the
   directory. "Show archived" brings them back into view with a struck-through name, and Restore
   puts them back.
5. **Roles.** Sign in as `care@riverside.example.org`, the pastoral role. There is no "Add someone"
   button and no Edit button, and `/people/new` says the role cannot add people. A `staff` role can
   edit but not archive.
6. **The audit log.** Every change above is in `audit_entries` with your user id, your role, your
   IP, and the before and after values.
