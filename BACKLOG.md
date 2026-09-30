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
| HRT-14 | Active session list with remote revoke | R1.10 | Resolved |
| HRT-15 | Church profile settings: name, address, timezone, service times | R1.1 | Resolved |
| HRT-43 | Brand colour on the member-facing and printed surfaces | R1.1 | New |
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
| HRT-22 | Relationships, independent of household | R2.4 | Closed |
| HRT-23 | Milestones, with the extensible kind list | R2.6 | Resolved |
| HRT-24 | Duplicate merge and review queue, reversible for 30 days | R2.8 | Resolved |
| HRT-25 | Bulk edit across a selection: tag, status, archive | R2.12 | Resolved |
| HRT-40 | Directory search, filtering, sorting and pagination | R2.x | Resolved |
| HRT-42 | Date field and calendar of our own, replacing the browser's | R24.x | Resolved |
| HRT-26 | Background check status and expiry tracking | R2.10 | New |
| HRT-27 | Birthdays and anniversaries list | R2.9 | New |

### F19. Data portability

| ID | Story | Req | State |
|---|---|---|---|
| HRT-28 | Import wizard: column mapping, dry run, duplicate handling | R19.1 to R19.3 | Resolved |
| HRT-38 | Excel (.xlsx) files, as well as CSV | R19.1 | Resolved |
| HRT-29 | Import rollback, reversible for 30 days | R19.4 | Resolved |
| HRT-30 | Complete export of every entity, open formats, no gate | R19.8 | Resolved |
| HRT-39 | Stream the export instead of building it in memory, once a church outgrows it | R19.8 | New |
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
| **Waiting on a test** | **HRT-16** fields, **HRT-32** church, **HRT-36** strings, **HRT-37** CI, **HRT-28**, **HRT-38**, **HRT-29** import, **HRT-30** export, **HRT-40** and **HRT-25** directory, **HRT-24** merge, **HRT-23** milestones, **HRT-15** settings, **HRT-42** date field, **HRT-14** sessions |
| **Next** | HRT-18 storage quota, then HRT-31 sample data, then HRT-13 MFA |

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

Two parts of R1.1 are left out. The logo needs file storage (HRT-18). The brand colour is stored
but no screen reads it, so the picker is off the settings page until one does (HRT-43). Putting it
back is one component and one line.

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

### HRT-14, how to test it

Press your email in the top right. Every device holding a live sign-in is listed.

1. **Two devices.** Sign in on your phone as well. Both appear, named by browser and platform, with
   the address and when each was last used. The one you are reading is marked.
2. **End one.** Sign out a device from the other device. Reload on the signed-out one: back to the
   sign-in page. It cannot mint a new token either, because the refresh tokens go with the session.
3. **End the rest.** "Sign out everywhere else" keeps the device you are on. That is the press
   somebody makes from a friend's laptop after using the church office computer.
4. **It is yours only.** The list is narrowed to your own user inside the database function, so
   another admin's devices never appear, and a session id typed into the form revokes nothing.

The session records belong to Supabase Auth, in a schema the app role cannot read. Reaching them
with the service role key would put that key in a request path, which it may never be in. Two
security-definer functions stand at that boundary instead, both narrowed by the verified user id.

On a database without Supabase Auth, including CI, the functions are absent and the card says so.

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
