# Code comment audit

A review of developer-facing comments across the repository against the code comment standard in
[engineering-guidelines.md](engineering-guidelines.md), October 2026.

## What was measured

| | |
|---|---|
| Source files measured (`.ts`, `.tsx`, `.sql`, `.mjs`) | 1,331 |
| Comment lines | 32,068 |
| Code lines | 161,793 |
| Comment density | 19.8% |
| Files changed by this audit | 39 |
| Comment lines rewritten | 124 |
| Executable lines changed | **0** |

The diff was checked line by line to confirm that every changed line is inside a comment. Nothing in
this audit alters behaviour.

## What the audit expected to find, and did not

Three of the defect classes the standard warns about are effectively absent here, and saying so is
more useful than inventing findings.

**TODO, FIXME, HACK, WORKAROUND, TEMP and DEPRECATED: zero occurrences.** A search across every
`.ts`, `.tsx`, `.sql`, `.mjs` and `.sh` file in the repository returns nothing. There is no stale
technical debt recorded in comments, and nothing to triage. Unresolved work lives on the board in
[BACKLOG.md](../BACKLOG.md) instead, which is where it belongs.

**Comments that restate the next statement: one occurrence, and it is legitimate.** A search for the
classic shapes (`// Set ...`, `// Get ...`, `// Return ...`, `// Loop ...`, `// Call ...`,
`// Check if ...`) returns a single line, `packages/db/scripts/seed-users.ts:56`, which reads
"Delete and recreate rather than upsert. An upsert leaves whatever was there" and is a reason rather
than a restatement. The `// Set loading to true` pattern does not exist in this codebase.

**Incorrect comments: three found, all from renames rather than from drift.** They are listed under
"Corrected facts" below. No comment was found claiming a performance or security property the code
does not have, and no comment was found describing removed behaviour other than those three.

## What the audit did find

The density is high at 19.8%, and the first instinct is to cut. Reading them says otherwise: the
great majority of these comments record **why** a line exists, and several are the only surviving
record of a decision. `packages/db/src/client.ts` explains why TLS is keyed on "the host is
loopback" rather than on a flag, because a flag gets set in the wrong environment once and is never
noticed again. That is exactly the comment the standard asks for. Cutting by density would have
destroyed it.

The real defect is **register**, not volume. The comments are written in a literary voice: metaphor,
personification, rhetorical inversion, and the occasional account of how a bug was found. The
information is good and the delivery makes it slower to read, and in a few places genuinely opaque.

### 1. Personification and metaphor (36 comments, 34 files)

The repository had a house idiom where a thing "wears" a colour, a path "speaks" a language, a
marker "breathes", and a form "shouts". It is consistent, and it is still a reader decoding an image
rather than reading a fact.

| File | Was | Now |
|---|---|---|
| `packages/db/src/repo/site-doc.ts` | Which of the theme's two button languages it speaks. | Button appearance: the theme's primary or secondary style. |
| `apps/web/app/(app)/members/directory.tsx` | The shape every mark on the tool row wears, link or button. | Shared styling for every control on the tool row, link or button. |
| `apps/web/components/guide/body.tsx` | The step somebody is on, whose marker breathes. | The step currently in progress, whose marker is animated. |
| `apps/web/lib/theme.ts` | What the document itself wears, which is the only place it can go. | Applied to the document element, which is the only place it can go. |
| `apps/web/app/(app)/home/timeline.tsx` | One block of the screen: a mark, a name, and its own way through. | One timeline entry: an icon, a label, and its own link. |
| `apps/web/lib/refuse.ts` | ...it answers in the only language that path speaks: a status and | ...it answers in the only form that path accepts: a status and |
| `apps/web/components/empty.tsx` | The icons an empty state can wear, by name. | The icons an empty state can show, by name. |
| `packages/db/src/errors.ts` | ...dressed up as a validation message is a bug nobody ever finds. | ...reported as a validation message is a bug nobody ever finds. |
| `apps/web/components/field-hint.tsx` | a form that shouts at the ninety-nine volunteers who already knew | a form that lectures the ninety-nine volunteers who already knew |

The surrounding reasoning was kept in every case. Only the figure of speech changed.

### 2. The status probes, rewritten in full (13 comments, 1 file)

`apps/admin/lib/probes.ts` carried the clearest examples of the register, and it is a file somebody
reads at the moment the platform is down. Every comment in it was rewritten.

| Was | Now |
|---|---|
| `/** The database the whole product is. */` | `/** Check database availability. */` |
| `/** How long any one service gets to answer. */` | `/** Per-probe deadline. */` |
| `/** A fetch that gives up rather than hanging the screen. */` | `/** fetch with the probe deadline applied. */` |
| `A probe that cannot answer in time answers anyway.` | `Resolve with whenLate if work has not settled within ms.` |
| `Working and slow is its own answer. A probe that takes four seconds is telling you something a green light would hide.` | `Report a slow pass as a warning. A four-second response is a signal that a green light would hide.` |
| `Nothing to call: the worker is a GitHub Actions schedule, and what it leaves behind is the evidence.` | `The worker is a GitHub Actions schedule, so there is no endpoint to call. Its state is inferred from the rows it leaves behind.` |

**Every invariant in that file was preserved**, including the reason the deadline wrapper exists at
all: the AbortSignal on a fetch does not cover a database connection, postgres.js waits on the pool
without a deadline, and without the wrapper the health route hung for five minutes on Vercel and
returned nothing. That is a regression-preventing fact and it stays, shorter.

### 3. One account of finding a bug (1 comment)

`packages/db/src/client.ts` explained that an IPv6-only Supabase host "sent a whole afternoon in the
wrong direction once already". The fact worth keeping is that `db.<ref>.supabase.co` publishes an
AAAA record and no A record, so on a network without IPv6 it fails as ENOTFOUND, which is
indistinguishable from a typo in the hostname. That is what the comment now says.

### 4. Corrected facts (3 comments)

| File | Problem |
|---|---|
| `apps/web/app/(app)/schedule/team-panel.tsx` | Referred to "the same path the setup dock draws". The setup dock was deleted in HRT-367 and replaced by the guide rail |
| `packages/songs/src/index.ts` | Said the package is "shared by the web platform and Hearth Stage". Stage has its own library and nothing in this repository imports the package. The header now says so and points at the inventory |
| `apps/web/lib/auth-errors.ts` | "Maria gets told what happened" used a persona name as if it were a defined term. Now "the person signing in" |

### 5. Stale terminology (11 comments, 1 screen lede)

"Operator" was replaced by "team member" in the product and the portal is the admin portal.
Comments in `apps/web/app/dev-gate/`, `apps/web/lib/dev-gate.ts`,
`apps/web/components/sandbox-banner.tsx`, `apps/web/components/watch-approval.tsx`,
`apps/web/app/api/auth/email/route.ts`, `packages/env/src/index.ts`,
`packages/db/scripts/seed-users.ts` and `packages/db/src/repo/platform.ts` still said operator, as
did the Log screen's lede in the admin portal.

These were corrected in the copy commit rather than this one, because the lede is user-facing text.

## By area

| Area | Files changed | What changed |
|---|---|---|
| Admin portal (`apps/admin`) | 2 | The whole of `lib/probes.ts`, plus the environment bar's header |
| Web application routes (`apps/web/app`) | 14 | Metaphors in settings, giving, groups, forms, reports, members, home |
| Web components (`apps/web/components`) | 8 | Empty states, stages, the guide, the shell, the church mark |
| Web library (`apps/web/lib`) | 4 | Theme, refuse, validation, the validated form |
| Database package (`packages/db`) | 4 | The client's DNS note, `errors.ts`, `repo/site-doc.ts`, one offline test |
| UI package (`packages/ui`) | 3 | `field.tsx` and two test headers |

## What was deliberately left alone

- **The reasoning itself.** Comments that state a tradeoff, such as "a tally that drifts is worse
  than no tally" or "half a list is worse than asking", read as rhetorical and are the actual
  engineering rationale behind a decision. The standard asks for the reason to be kept.
- **Security and safety comments.** Nothing in `packages/db/sql/security.sql` (251 comment lines),
  the RLS notes, the check-in offline reasoning in `packages/db/src/repo/offline.ts`, the authorized
  pickup logic, the audit trigger discussion or the Stripe paths was shortened. Several were read
  closely and left exactly as written.
- **Schema comments.** `packages/db/src/schema/tenancy.ts` is 93% comment, and the comments are
  per-column notes saying what a column means and which requirement it serves. That is the right
  shape for a schema file.
- **Requirement and story IDs.** Every `R8.21`, `HRT-367` and `N3` reference was kept.
- **Field doc comments that are noun phrases.** "The day, as YYYY-MM-DD.", "Negative on a refund.",
  "Twenty to a page, the same as the directory." A heuristic scan flagged 705 one-line doc comments
  with no verb; reading them shows the overwhelming majority are conventional, concise field
  documentation, so no mechanical pass was applied.
- **`packages/songs`.** Its comments were corrected for accuracy rather than rewritten, because the
  package's future is an open decision in
  [repository-inventory.md](repository-inventory.md).

## Unresolved technical debt

None is recorded in comments, because there are no marker comments in the repository. What is
genuinely unresolved is tracked elsewhere:

| Item | Where it is tracked |
|---|---|
| TOTP multi-factor | HRT-13, Deferred |
| SMS and the Twilio subaccount decision | HRT-286 |
| Group messaging and serving reminders, waiting on a church having a provider | HRT-87, HRT-126 |
| DSAR handling | [ROADMAP.md](../ROADMAP.md) section 12 |
| Nine unreferenced application files, and `packages/songs` | [repository-inventory.md](repository-inventory.md) |

## Validation

| Check | Result |
|---|---|
| `pnpm typecheck` | 8 of 8 tasks passed |
| `pnpm lint --max-warnings 44` | 0 errors, 41 warnings, all pre-existing `next/image` advisories |
| `pnpm --filter @connectapp/i18n test` | 29 passed |
| Diff review | Every changed line is inside a comment. No executable line changed |

## What this audit did not cover

Stated plainly rather than implied. 32,068 comment lines cannot all be rewritten well in one pass,
and a mechanical pass would have destroyed the reasoning that makes them worth having.

This audit covered: every marker comment (none exist), every comment matching the metaphor and
personification patterns, every comment matching the code-restating patterns, every comment
referencing a renamed or removed thing that could be found by searching for the old names, and the
whole of the one file whose register the owner quoted.

It did not cover: a line-by-line reading of all 1,331 files. The files most likely to still carry
the old register are the ones at the top of the density table in
[repository-inventory.md](repository-inventory.md): `repo/members.ts`, `repo/membership.ts`,
`repo/messages.ts`, and `app/(app)/members/directory.tsx`. Their comments were sampled and found to
be reasoning-dense and accurate, and a full pass over them is worth doing as its own piece of work.
