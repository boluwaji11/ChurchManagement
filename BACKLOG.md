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
| HRT-32 | Create a church and its first Owner from sign-up. A church is a `tenants` row. | R1.1, R22.1 | Resolved |
| HRT-16 | Custom field definitions and values, in the UI | R1.12 | Resolved |
| HRT-17 | Tag management, assignment, and merge, in the UI | R1.13 | Closed |
| HRT-34 | Tags on households, once households have a page of their own | R1.13 | New |
| HRT-35 | Audit trigger on every tenant table, found by query rather than a list | R1.11 | Closed |
| HRT-18 | Storage quota display with a warning at 80% | R1.16 | New |
| HRT-36 | **Externalise every user-facing string.** | R22.8 | Resolved |
| HRT-37 | CI: typecheck, the test suite, and the contrast and accessibility audit | R22.7, N7 | Resolved |

### F2. People

| ID | Story | Req | State |
|---|---|---|---|
| HRT-19 | People and households, read-only directory | R2.1, R2.2 | Closed |
| HRT-20 | Notes in two classes, confidential ones encrypted and separately gated | R2.7 | Closed |
| HRT-21 | **Add, edit and archive a person. Households and contact methods.** | R2.1 to R2.3, R2.5, R2.13 | Closed |
| HRT-22 | Relationships, independent of household | R2.4 | New |
| HRT-23 | Milestones, with the extensible kind list | R2.6 | New |
| HRT-24 | Duplicate **merge**, reversible for 30 days. Detection shipped with HRT-28. | R2.8 | New |
| HRT-25 | Bulk edit across a selection | R2.12 | New |
| HRT-26 | Background check status and expiry tracking | R2.10 | New |
| HRT-27 | Birthdays and anniversaries list | R2.9 | New |

### F19. Data portability

| ID | Story | Req | State |
|---|---|---|---|
| HRT-28 | Import wizard: column mapping, dry run, duplicate handling | R19.1 to R19.3 | Resolved |
| HRT-38 | Excel (.xlsx) files, as well as CSV | R19.1 | Resolved |
| HRT-29 | Import rollback, reversible for 30 days | R19.4 | Resolved |
| HRT-30 | Complete export of every entity, open formats, no gate | R19.8 | New |
| HRT-31 | Sample and demo data | R19.7 | New |
| HRT-33 | Seed and gallery names to US names, since US churches come first | R19.7 | Closed |

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
| **Waiting on a test** | **HRT-16** fields, **HRT-32** church, **HRT-36** strings, **HRT-37** CI, **HRT-28**, **HRT-38** and **HRT-29** import |
| **Next** | HRT-30 complete export, then HRT-24 merge, then the rest of R2.x |

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
7. **Undo it.** Past imports are listed under the wizard. "Undo this import" removes the people it
   added and puts back the ones it changed. Edit somebody the import created first, then undo: they
   are archived rather than removed, because that edit was not part of the mistake. Undoing is Owner
   and Admin only, since one press can remove hundreds of people.

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
