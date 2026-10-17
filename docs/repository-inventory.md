# Repository inventory

What is in this repository, what each questionable file is for, and what should happen to it.

Taken 17 October 2026 against commit `1a8c6327`, and updated after the safe organization work was
done. Every finding below carries the evidence it came from.

**Nothing in the DELETE column has been acted on.** Those need a decision first, and they are
collected under "Decisions needed" at the end. What has been done is marked **DONE** in place.

## How to read the recommendations

| Category | Meaning |
|---|---|
| **KEEP** | Active or necessary. No action. |
| **UPDATE** | Useful and out of date. Fix in place. |
| **MOVE** | Useful and in the wrong place. |
| **ARCHIVE** | Historical and worth preserving. Keep it, label it. |
| **DELETE** | Confirmed unused. Needs approval. |

Risk is the risk of acting on the recommendation, not the risk of leaving it alone.

## Shape of the repository

```
apps/web          809 tracked files with apps/admin. The product: staff screens,
                  the member portal, public church sites, the website builder
apps/admin        The platform admin portal, for the ConnectApp team
packages/db       631 tracked files across packages. Schema, RLS, repositories,
                  the SQL security layer, isolation tests, operational scripts
packages/ui       Design tokens, the token generator, shared components, contrast audit
packages/i18n     The message catalogue, t, plural, spelling, region resolution
packages/mail     Transactional email markup and the send path
packages/env      Environment declaration and the credential guard
packages/songs    The song domain. Nothing imports it
docs              43 tracked files, including the October 2026 design prototypes
scripts           7 files: 4 wired into CI or package scripts, 2 documented, 1 orphan
drills            Quarterly restore drill census records
.github           CI, drain and health workflows, CODEOWNERS, 4 discussion templates
Stage             A separate git repository, gitignored. Not part of this one
```

## Product status

What each major area actually is, read from the code rather than from a plan. 397 stories on the
board: 227 Closed (built and tested by a person), 80 Resolved (built, waiting to be tested), 37 New,
14 deferred.

| Area | Status | Evidence |
|---|---|---|
| Church onboarding and approval | Implemented and verified | `apps/web/app/create-church/`, `sign-up/`, provisional banner, approval queue in `apps/admin` |
| People and households | Implemented and verified | `app/(app)/members/`, tags, custom fields, merge, import and export |
| Attendance | Implemented and verified | `app/(app)/checkin/`, `reports/attendance/` |
| Children's check-in | Implemented, needs pilot validation | `app/(app)/checkin/`, `station/`, offline support, `public/station-sw.js`. No church has run a service on it |
| Groups | Implemented and verified | `app/(app)/groups/`, public finder at `/g/<slug>` |
| Volunteers and serving | Implemented and verified | `app/(app)/schedule/`, `(bare)/schedule/respond/[token]/` |
| Service planning | Implemented and verified | `app/(app)/services/`, plan templates, print view |
| Follow-up pipelines | Implemented and verified | `app/(app)/followups/` |
| Forms | Implemented and verified | `app/(app)/forms/` |
| Events | Implemented and verified | `app/(app)/events/`, registration, roster, preview |
| Calendar | Implemented and verified | `app/(app)/calendar/`, in nav |
| Reports | Implemented and verified | `app/(app)/reports/`, 8 canned reports plus a custom builder with PPTX export |
| Giving | Implemented, needs validation against a real Stripe account | `app/(app)/giving/`, campaigns, payouts, statements, counts. Release 0.3 |
| Messaging, email | Implemented, needs validation with a church's own provider | `app/(app)/messages/`, `settings/email/`, `packages/db/src/repo/email-*.ts`, bounces, consent |
| Messaging, SMS | Planned, not built | HRT-286 needs a Twilio subaccount decision from outside this repository |
| Website builder | Implemented, needs validation | `app/(app)/website/builder/`, `components/church-site/sections/`, `repo/site-*.ts`, revisions, publishing, domains |
| Public church sites | Implemented | `(bare)/website/preview/`, `components/church-site/page-view.tsx` |
| Member portal | Implemented and verified | `components/portal/`, `public/portal-sw.js` |
| Platform admin portal | Implemented and verified | `apps/admin`, status, delivery, team, approvals |
| Setup guide | Implemented and verified | `components/guide/`, `lib/setup-guide.ts`, `repo/setup.ts` |
| Song library and Stage sync | Deferred, not built here | Stage is a separate repository with its own library |
| Children's ministry paperwork | Deferred | Built once, removed, tables dropped in migration 0058 |
| Multi-site | Settled non-goal for v1 | `/choose-church` serves the one-person-many-churches case instead |

No church is running on the platform. Nothing here should be described as production-proven.

## Cleanup candidates

### Dead application code

A scan of all 1,155 tracked TypeScript and TSX files for modules nothing imports, with Next.js
router entry points and test files excluded, then each candidate re-checked by its exported symbol
name rather than by filename. Seven files survived both passes.

| Path | Purpose | Status | References | Action | Risk | Evidence |
|---|---|---|---|---|---|---|
| `apps/web/app/(bare)/checkin/rooms/incident.tsx` | `IncidentDialog`, filing an incident from the room board | Obsolete | None | DELETE | Low | `IncidentDialog` appears nowhere else. Its directory has no `page.tsx`, so the screen it belonged to is gone. Incidents are filed from `app/(app)/incidents/file-report.tsx` today |
| `apps/web/app/(bare)/checkin/rooms/actions.ts` | `board()` and `report()` for that screen | Obsolete | `incident.tsx` only | DELETE | Low | `board()` has no caller at all. `report()` has one, the file above. The live supervisor board is `app/(app)/checkin/floor.tsx` |
| `apps/web/app/(app)/settings/church/domain-reading.tsx` | `DomainReading`, the DNS findings panel | Obsolete | None | DELETE | Low | `DomainReading` appears nowhere else. `settings/church/page.tsx` renders `ChurchSections`, which does not use it |
| `apps/web/app/(app)/settings/church/domain-help.tsx` | `DomainHelp`, the explanation under those findings | Obsolete | `domain-reading.tsx` only | DELETE | Low | Its only importer is the file above |
| `apps/web/app/(app)/members/availability.tsx` | `Availability`, blockout dates and serving frequency | Obsolete | None | DELETE | Medium | `Availability` appears nowhere else. It is the only caller of `saveBlockout`, `dropBlockout` and `saveFrequency` in `app/(app)/schedule/actions.ts`, so those three exported server actions die with it. Removing them is a code change beyond this audit and is listed under "Decisions needed" |
| `apps/web/components/sort-th.tsx` | A wrapper passing `next/link` to the UI `SortTh` | Obsolete | None | DELETE | Low | Screens import `SortTh` from `@connectapp/ui` directly. The only other mention is the `/design` gallery, which also uses the UI component |
| `apps/web/lib/panel-reset.ts` | `useResetOnClose`, clearing a panel's fields when it shuts | Obsolete | None | DELETE | Low | `useResetOnClose` appears nowhere else |
| `apps/web/lib/supabase/browser.ts` | `supabaseBrowser()` for sign-in and sign-out | Uncertain | None | DELETE | Medium | `supabaseBrowser` has no caller. Auth happens through server routes (`app/auth/`, `app/api/auth/email/`). Keep if a browser client is wanted for a future client-side sign-in |
| `apps/admin/lib/supabase/browser.ts` | The same, in the admin portal | Uncertain | None | DELETE | Medium | Same evidence. The portal signs in through `app/auth/verify/route.ts` and `app/join/route.ts` |

### Operational scripts

`packages/db/scripts/` holds 23 scripts. Nine are wired into `packages/db/package.json`. The other
fourteen run through `pnpm --filter @connectapp/db exec tsx scripts/<name>.ts` and are reachable only
by knowing they exist.

**Wired and active:** `migrate`, `seed`, `seed-users`, `metrics`, `approve`, `census`,
`platform-admin`, `dev-account`, `seed-dev-churches`. KEEP.

| Path | Purpose | Status | Action | Risk | Evidence |
|---|---|---|---|---|---|
| `scripts/seed-giving.ts` | A year of gifts on the seeded church | Active | **DONE.** Wired as `seed:giving` | Low | Marked "LOCAL DEVELOPMENT ONLY" in its header. Still the only way to get giving screens populated |
| `scripts/seed-member.ts` | A household, group and serving for the member account | Active | **DONE.** Wired as `seed:member` | Low | Same. The portal renders empty states without it |
| `scripts/seed-staff.ts` | Accounts for a few seeded members | Active | **DONE.** Wired as `seed:staff` | Low | Same, and it is idempotent by name |
| `scripts/seed-notifications.ts` | One notification per kind, to view the bell | Active | **DONE.** Wired as `seed:notifications` | Low | Same |
| `scripts/seed-report.ts` | A built report, through the screen's own path | Active | **DONE.** Wired as `seed:report` | Low | Carries its own usage line. Exercises R18.12 |
| `scripts/forget-stripe.ts` | Drops a church's stored Connect account | Active | KEEP | Low | An operational tool for a support case, not a one-off. Document it in environments.md |
| `scripts/drop-template.ts` | Removes an email template by name | Active | KEEP | Low | Same. Repairs a template written by a broken build |
| `scripts/sync-account-emails.ts` | Aligns a record's address with the sign-in address | Uncertain | KEEP | Low | The drift it fixes was closed by the profile screen, but it is a repair tool a support case could need again |
| `scripts/link-accounts.ts` | Gives every account a member record | Uncertain | KEEP | Low | Same shape: the gap is closed for new accounts, the repair stays useful |
| `scripts/defuse-emails.ts` | Rewrites seeded addresses so they cannot reach a person | Historical | KEEP | Low | A safety tool. The seed no longer writes real-looking addresses, and running this again costs nothing |
| `scripts/historical/fold-households.ts` | Folds one-per-person households into one per surname | Historical | **DONE.** Moved to `scripts/historical/` | Low | Repaired a specific seeded-data shape that the seed no longer produces |
| `scripts/historical/drop-empty-households.ts` | Removes archived households nobody is in | Historical | **DONE.** Moved to `scripts/historical/` | Low | The cleanup pass after `fold-households` |
| `scripts/historical/name-auth-users.ts` | Copies a member's name into auth metadata | Historical | **DONE.** Moved to `scripts/historical/` | Low | Header says local development only, and names the specific seeded mismatch it fixed |
| `scripts/historical/rename-member.ts` | Renames one seeded member | Historical | **DONE.** Moved to `scripts/historical/` | Low | Written to keep a real person's name out of a marketing screenshot. The screenshots are taken |

**Done.** The four finished repairs were moved to `packages/db/scripts/historical/`, with a README
saying what each one repaired, so a future reader can tell a live tool from a finished repair. Their
relative imports were corrected for the extra directory level and the package typechecks.

### Root scripts

| Path | Purpose | Status | References | Action | Risk |
|---|---|---|---|---|---|
| `scripts/browser-check.mjs` | Signs in through Playwright and reports what the browser said | Active | `docs/engineering-guidelines.md` | KEEP | Low |
| `scripts/build-client-catalogue.mjs` | Generates the browser's message catalogue | Active | `package.json`, `packages/i18n/package.json`, CI | KEEP | Low |
| `scripts/check-backlog.mjs` | Fails CI when a shipped requirement has no story | Active | CI | KEEP | Low |
| `scripts/check-member-routes.mjs` | Fails CI when a screen under `/members` is unnamed | Active | CI | KEEP | Low |
| `scripts/set-dev-stripe.sh` | Writes development Stripe keys to `.env.local` and Vercel Preview | Active | `docs/environments.md` | KEEP | Low |
| `scripts/set-dev-resend.sh` | The same for Resend | Active | `docs/environments.md` | KEEP | Low |
| `scripts/vercel-env.sh` | Copies the production environment from `.env.local` into the linked Vercel project | Active | `docs/environments.md` | **DONE.** Documented, KEEP | Low |

`scripts/vercel-env.sh` was referenced by no package script, no workflow and no document, which is
why it read as an orphan. It is not one: it is how production environment variables are set, and it
carries the record of the time its own list went stale and every church's sealed credential failed
to open in production. It is now documented in `docs/environments.md` under "The scripts beside this
document".

### Assets

**All eight SVG illustrations are in use**, through a dynamic path. `components/site/art.tsx` builds
`/art/${piece.name}.svg` from a `Piece` list, and `app/page.tsx` names `family`, `sanctuary`,
`gathering`, `giving`, `safe`, `congregation` and `fellowship` in that list, with `connecting`
referenced directly. A static-import scan reports seven of the eight as unreferenced, which is wrong.

| Path | Status | Action |
|---|---|---|
| `apps/web/public/art/*.svg` (8 files) | Active, dynamically referenced | KEEP |
| `apps/web/public/marketing/*.png` (4 files) | Active | KEEP, all four referenced from `app/page.tsx` |
| `apps/web/public/portal-sw.js` | Active | KEEP, registered by `components/portal/installed.tsx` |
| `apps/web/public/station-sw.js` | Active | KEEP, registered by `app/(app)/checkin/offline/connection.tsx` |

`art/sanctuary.svg` keeps the old product name in its filename. Renaming it means editing the
`Piece` list in `app/page.tsx` as well, which is a code change for no behavioural gain. Left alone
deliberately.

### Documentation

| Path | Purpose | Status | Action | Risk | Evidence |
|---|---|---|---|---|---|
| `README.md` | The public front door | Obsolete | UPDATE | Low | Says "the code is not started" and "Nothing but the design system exists yet" against 809 tracked application files. Lists Songs as a shipped feature. Phase 3 of this overhaul replaces it |
| `CONTRIBUTING.md` | How to contribute | Obsolete | UPDATE | Low | Says "Status: pre-alpha. The specification is complete, the code is not started". Its "Before there is code" section is the whole of its advice. Writing style section still asks for comma-separated statement pauses, which was withdrawn |
| `ROADMAP.md` | Release plan | Obsolete | UPDATE | Low | Mixes a release sequence with a progress snapshot, and puts money last after 0.3 shipped it |
| `SECURITY.md` | Reporting a vulnerability | Missing | Create | Low | No such file. A public AGPL repository with church records needs one |
| `docs/README.md` | Documentation index | Missing | Create | Low | 20 documents in `docs/` with no index |
| `docs/ux-writing.md` | Product language | Created | KEEP | Low | New in this overhaul |
| `docs/repository-inventory.md` | This file | Created | KEEP | Low | New in this overhaul |
| `docs/messaging.md` | In-app messages, no provider involved | Active | KEEP | Low | Distinct from the two below. Covers R16.9 and the website support form |
| `docs/messaging-architecture.md` | How a church connects its own provider | Active | KEEP | Low | HRT-286, HRT-287. The design, written before any vendor account existed |
| `docs/messaging-setup.md` | What to do in the Twilio and Resend consoles | Active | KEEP | Low | An operator runbook, for whoever holds the platform accounts |
| `docs/stage-architecture.md`, `docs/stage-sync-contract.md`, `PRD-STAGE.md`, `BACKLOG-STAGE.md` | Hearth Stage specification | Active as reference | KEEP | Low | Stage is built in its own repository. These stay as the specification of record and are explicitly not to be deleted |
| `docs/checkin-acceptance.md` | Check-in acceptance criteria | Active | KEEP | Low | Safety-critical area. The acceptance record for R8.x |
| `docs/onboarding-integrations.md` | Integration work during onboarding | Active | KEEP | Low | Referenced by the onboarding stories |
| `drills/README.md` | What the drill census files are | Active | KEEP | Low | Explains why the directory is committed. The directory holds no census files yet, which is itself worth noting against R21.6 |
| `AGENTS.md` | Turborepo's managed agent guidance | Active, generated | **DONE.** Committed | Low | Written and re-added by `turbo`, which asks for the block to be committed so it does not reappear as an uncommitted change on every run |

### The design prototypes

`docs/redesign/design/` holds 10 HTML prototypes plus `support.js` and `data.js`.

| Path | Status | Action | Evidence |
|---|---|---|---|
| `docs/redesign/design/*.dc.html` (10 files) | Historical and still a live reference | **DONE.** Renamed | Colours, type, spacing and the shell measurements are authoritative per `docs/redesign/README.md`. **Every reference to them in the docs is broken:** the files are named `Hearth A - Warm Office.dc.html` while `README.md`, `handoff.md` and `screen-map.md` all cite `ConnectApp A - Warm Office.dc.html`. The product rename touched the prose and missed the filenames |
| `docs/redesign/design/support.js` | Prototype runtime | KEEP | Needed for the prototypes to run. Explicitly not for `apps/web` |
| `docs/redesign/design/data.js` | Prototype sample data | KEEP | Sample people, households, gifts and funds. Stays in this folder; fake data must never be loadable into a real church |
| `docs/redesign/plan.md` | How the work was broken into HRT-307 to HRT-336 | Historical | ARCHIVE in place | The stories it describes are on the board. Keep as the record of the argument |
| `docs/redesign/handoff.md` | The designer's own brief | Historical | KEEP unedited | Deliberately unedited. The filename references in it are broken for the reason above |

No prototype is a deletion candidate. They were created in an earlier design iteration and that is
not a reason to remove them.

### Configuration inconsistencies

| Path | Finding | Action | Risk |
|---|---|---|---|
| `.nvmrc` | Said `24` while CI pins `NODE_VERSION: "22"` | **DONE.** Now 22 | Low |
| `packages/songs` | 19 files, full test suite, nothing in this repository imports it | ARCHIVE or DELETE, needs a decision | Medium |
| `.github` | No issue template, though four discussion templates exist | Optional | Low |

`packages/songs` is the one genuinely open question. It is the song domain from the plan where this
repository owed Stage a shared library. Stage now has its own, so nothing here imports the package,
but it is complete, tested, and the specification in PRD section 9.4 still describes its shape. It is
in the workspace, so it typechecks and tests on every CI run. Listed under "Decisions needed".

## Preserved without question

Not touched by this overhaul, and not candidates for anything:

- `packages/db/migrations/` and its journal and snapshots. Migration history is never deleted.
- `packages/db/sql/search.sql` and `security.sql`. The security layer.
- `.github/workflows/`. CI, drain, health.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`,
  `eslint.config.mjs`.
- `.env.example`.
- `LICENSE`.
- `drills/`.
- Every test suite.
- `Stage/`, which is a separate git repository and gitignored.

## Decisions needed

**Nothing in this section has been acted on. Each one needs your approval.**

1. **Delete the nine dead application files** listed under "Dead application code". Each was
   confirmed twice: once by a scan for modules with no importer, once by searching for the exported
   symbol by name. The two Supabase browser clients are the only ones with a plausible future use,
   so they could be kept while the other seven go.
2. **Remove `saveBlockout`, `dropBlockout` and `saveFrequency`** from
   `apps/web/app/(app)/schedule/actions.ts` if `members/availability.tsx` goes. They have no other
   caller. The alternative is to keep both and give `Availability` a screen again, since blockout
   dates are a real R10.x requirement with no other UI. That is a product decision rather than a
   cleanup one.
3. **`packages/songs`:** archive it, delete it, or keep it as the specification's reference
   implementation. Nothing imports it, Stage has its own library, and it costs a typecheck and a
   test run per CI build. Its header now says all of this, so leaving it costs nothing but noise.

Done since this file was written, and recorded in place above: the four finished repair scripts
moved to `packages/db/scripts/historical/`, the nine design prototypes renamed, five development
seeds wired into `package.json`, `scripts/vercel-env.sh` documented, `.nvmrc` aligned with CI, and
`AGENTS.md` committed.
