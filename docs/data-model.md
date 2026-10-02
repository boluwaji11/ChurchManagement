# Data model

Entity reference. Requirement IDs refer to [../PRD.md](../PRD.md).

Every table carries `tenant_id` and a Postgres row-level security policy. Campus and location columns
exist from the first migration even though v1 exposes a single campus. See
[architecture.md](architecture.md) for why.

## Entity map

```
Tenant ──┬── Campus ── Location ── Room
         ├── Person ──┬── HouseholdMembership ── Household
         │            ├── Relationship (spouse, guardian, emergency, do-not-contact)
         │            ├── Milestone
         │            ├── Note (general | confidential)
         │            ├── BackgroundCheck
         │            ├── ContactMethod (email | phone | address)
         │            └── CustomFieldValue
         ├── ServiceOccurrence ──┬── AttendanceRecord
         │                       ├── CheckInEvent ── CheckOutEvent
         │                       └── Plan ── PlanItem ──┬── Song ── Arrangement
         │                                              ├── ScriptureRef
         │                                              └── Attachment
         ├── Team ── Position ── ScheduleRequest (pending|accepted|declined)
         ├── Group ── GroupMembership ── GroupMeeting ── GroupAttendance
         ├── Fund ── Donation ── Batch
         │        └── Pledge ── Campaign
         ├── Event ── Registration ── Registrant
         ├── Pipeline ── PipelineInstance ── PipelineStep ── Task
         ├── Form ── FormSubmission
         └── AuditEntry (append only)
```

## The song schema

This is the spine. It ships in 0.4, in Phase 1, because Hearth Stage renders directly from these
records with no transformation and no import step. Deleting the import step is the whole product idea,
and a convenient song list now is a rewrite later.

```
Song
  id, tenant_id
  title, alternate_titles[]
  author, composer, publisher, year
  ccli_number, copyright_line, is_public_domain
  themes[], tempo_bpm, time_signature, typical_duration_seconds
  default_key
  primary_language
  last_used_at

SongSection                       one row per labeled block of lyrics
  id, song_id
  section_type    intro | verse | pre_chorus | chorus | bridge | tag | instrumental | ending
  label           "V1", "C", "B2"
  sort_order
  lines[]         ordered lines of text, never a single blob
  language        ISO code
  translation_of  nullable self-reference, aligning a translated section to its primary

Arrangement
  id, song_id
  name            "Advent 2026", "Acoustic"
  key, tempo_bpm
  sequence[]      ordered section labels: ["V1","C","V2","C","B","C","C"]
  chordpro        full chart, transposable
  is_default

ArrangementMedia
  id, arrangement_id
  kind            reference_audio | practice_track | video | chart_pdf
  storage_key, duration_seconds

SongUsage                         drives CCLI reporting in R12.10
  id, tenant_id, song_id, arrangement_id
  plan_item_id, service_occurrence_id
  used_on, key_used
  source          platform | stage
```

### Three properties, and what each one buys

**1. Lyrics are structured, not a blob (R12.4).** Stage renders one slide group per section (S2). A
blob would force a parser, a parser would force an import step, and an import step is exactly the
ProPresenter handoff Hearth exists to delete.

**2. Sequence is data (R12.5).** The arrangement says `V1 C V2 C B C C`, so Stage builds the slide
order with no human step, and the same sequence drives the printed chart and the music stand view
(R11.13). One source of truth for what order the song is actually played in.

**3. Translations are section-aligned (R12.8).** A bilingual slide (S15) is a join, not a second song.
`translation_of` points a Spanish `V1` at the English `V1`, so Stage can render both without guessing
which verse pairs with which.

### Resolution rules

- A `PlanItem` of type `song` references a `Song` **and** a specific `Arrangement`, so the plan carries
  the key and the sequence, not just the title (R11.4).
- Resolving a plan item to slides means: take the arrangement's `sequence`, map each label to its
  `SongSection`, and emit slides in that order. Pure function, shared between web and Stage through
  `packages/songs`.
- A label appearing twice in a sequence emits the same section twice. Sections are not consumed.
- Transposition is computed from `Arrangement.key` to the requested key and never mutates stored
  ChordPro.

## Notes on other entities

**Person and Household (R2.2).** A person belongs to one household at a time, through
`HouseholdMembership`, with history retained. Household changes are common (marriage, children leaving,
divorce) and the history matters for giving statements and directory accuracy.

**Relationship (R2.4).** Independent of household, because guardianship and custody do not follow
household lines. `do-not-contact` pairs are enforced at directory generation and at check-in checkout
(R8.9), which is the situation they exist for.

**Note (R2.7, R6.2).** Two classes in one table with a hard permission boundary. `confidential` notes
are encrypted at the application layer with a separate key, restricted to the Pastoral tier, and every
read writes an audit entry.

**CheckInEvent (R8.x).** Carries the per-visit security code, the room, the station, and whether it was
created offline. `CheckOutEvent` records the code presented or the supervisor override with its reason.
Both are permanent, because a safeguarding record is not something a church deletes.

**Donation and Batch (R13.x).** `Batch` holds the declared expected total, the entered total, the two
counters, and any variance note. A batch cannot close while those disagree without a note (R13.11).
Non-cash gifts carry a description and an estimated value and are kept out of cash totals (R13.13).

**AuditEntry.** Append only, no update or delete for any application role including Owner. Records
actor, action, entity, before and after values, timestamp, and IP.

## Deletion

**Archive, never hard delete (R2.13).** Archived people leave all lists and counts and retain giving
and attendance history. True deletion happens only through the DSAR path (R21.7), which has a
documented retention exception for financial and safeguarding records.

Reversibility is a rule, not a feature: person merges are reversible for 30 days (R2.8), imports are
rollback-able for 30 days (R19.4).
