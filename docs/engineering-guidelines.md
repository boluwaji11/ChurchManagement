# Engineering guidelines

How this project makes decisions, and the rules that apply to every change. Short by design. The full
specification is [PRD.md](../PRD.md); this is the part you need in your head while working.

## What this is

**Hearth** is a church management platform for small churches, given to them at no cost and built for
the volunteer who actually runs it.

Phase 2 adds **Hearth Stage**, a worship presenter that replaces ProPresenter and reads the same
service plan and song library as the management system.

Read [PRD.md](../PRD.md) before proposing features. Requirement IDs from the PRD (`R8.6`, `R12.4`,
`S2`) are the reference used in issues, branches, and commits.

## The thesis, in one line

Church software churches can afford already exists and they cannot use it. Hearth is the first that is
both affordable and usable by a volunteer who gives four hours a week.

Rock RMS costs nothing and needs a developer. Breeze is usable and costs $72 a month. The target is
Rock RMS's price with Breeze's usability. Every scoping decision follows from that: **if a feature makes
the product more powerful but less usable by a non-technical volunteer, it is cut or deferred**, no
matter what the competition markets.

## Settled decisions, do not relitigate

| Decision | Choice |
|---|---|
| Market | US and global first. Stripe, ACH, email-centric, USD. |
| Funding | Donation and grant funded. No paid tier, ever. No freemium. |
| Delivery | Hosted multi-tenant SaaS only in v1. Source is public, self-hosting is unsupported. |
| Presenter | Phase 2, separate PRD at build time. Phase 1 owes it the song schema and the sync contract, nothing else. |
| Licence | AGPL-3.0 |
| Database | Supabase. Postgres plus auth plus storage. See PRD section 13.9. |
| Name | Hearth. "Sanctuary" was in use by three competitors. Name lives in config. |
| Target | Churches of 50 to 500 attendance, 0 to 2 paid staff, one non-technical admin. |

Anything implying a paid tier, self-hosting in v1, platform-held funds, or platform-paid SMS
contradicts a settled decision. Say so rather than building it.

## Hard constraints that flow from the funding model

1. **Never touch the money.** Giving runs on Stripe Connect against the church's own account with a
   platform application fee of **zero**. We are not a money transmitter. PCI scope stays SAQ-A, so
   card data never enters a request path we control. Stripe-hosted elements only, always.
2. **Bring your own messaging.** Churches supply their own Resend, SMTP, and Twilio credentials.
   Never build anything that resells messaging credits. The shared email quota is transactional only.
3. **Hard storage quotas**, enforced and visible. No sermon video hosting.
4. **Self-serve past the point of comfort.** Support is the real cost, not servers. Migration
   (R19.x) and onboarding (R22.x) are first-class features with acceptance criteria, not polish.
5. **Trust is structural.** AGPL source, ungated one-click export, published wind-down commitment,
   no model training on church data. Never weaken any of these for convenience.

## Two things that are non-negotiable

**Check-in is safety-critical (section 8.8).** A defect here can cause physical harm to a child.
Matching label pairs with unique per-visit codes, authorised pickup enforced at checkout, allergies
shown on screen at the moment of check-in, and **it keeps working with no network**. The design case
is 09:58 on a Sunday with forty families queuing and the wifi down. Never weaken an R8 requirement
for implementation convenience. Raise it instead.

**The song schema is the spine (section 9.4).** Lyrics are stored as ordered labeled sections, never
a blob. Arrangement sequences are data. Translations are section-aligned. This ships in 0.4, in
Phase 1, because Phase 2 renders directly from these records with no import step. A "good enough"
song list now is a rewrite later.

## Stack

TypeScript end to end, pnpm workspaces plus Turborepo, Next.js App Router, **Supabase** (Postgres,
auth, storage), Drizzle, a durable job queue, Stripe Connect, PWA for members. Front end is Tailwind
CSS v4, shadcn/ui on Radix, Lucide icons, Motion. Phase 2 presenter is Electron sharing a
`@hearth/songs` package with a local SQLite cache.

**Supabase rules.** Use Drizzle against Postgres directly, never the auto-generated PostgREST API,
because field-level permissions belong in our query layer. Connect as a role RLS applies to and set
`app.tenant_id` per transaction. **The service role key never appears in a request path**, only in the
job worker. Supabase Auth for authentication, our own tables for authorization. Realtime is unused in
v1.

See [architecture.md](architecture.md), [data-model.md](data-model.md), and
[design-system.md](design-system.md).

## Engineering rules

- **Tenant isolation is enforced by Postgres RLS**, not by application filtering. Application-layer
  filters are a convenience, never a control. Every new table gets `tenant_id` and a policy.
- **Field-level permissions are enforced at the query layer.** A Staff-role query for a donation
  returns the record without the amount field present. Never rely on the view layer to hide data.
- **Archive, never hard delete.** True deletion happens only through the DSAR path.
- **Every destructive action is reversible or confirmed.** Merges reversible 30 days, imports
  rollback-able 30 days.
- **Audit log is append only** and cannot be modified by any application role, including Owner.
- **Externalise every user-facing string** into `packages/i18n`, from the first commit, even though
  v1 ships English only. `t("key")` and `plural("stem", n)`. Keys are typed against the catalogue, so
  a typo is a compile error rather than a blank space on a screen. A test walks the screens and fails
  on copy written inline. The `/design` gallery is exempt: it is a tool for us, not a screen a church
  sees.
- **Accessibility is WCAG 2.2 AA**, audited in CI. A check-in station has to work for someone with a
  tremor and reading glasses.
- **No deploys during Sunday 07:00 to 14:00 local windows.** Enforced by tooling.
- Zero-downtime migrations. A church cannot be told the database is upgrading on a Saturday night.

## Design

Full specification in [design-system.md](design-system.md). Read it before writing any UI.
Hearth replaces software churches pay for, so it has to look better than that software.

- **Three density modes, one system.** `office` dense and keyboard-first, `station` a Sunday kiosk at
  56px targets and 20px text, `portal` app-like on a phone. Resolved through tokens on the root
  element. A component is written once and must work in all three with no density branches in its own
  code.
- **Colour marks identity, and nothing else.** Warm stone canvas, ink primary, ember accent, plus an
  eight-hue spectrum at matched lightness and chroma. Hues are assigned to things: rooms, teams,
  group types, funds, ministries, pipeline stages. Room colour prints on the child's check-in label
  so a volunteer can direct a parent by colour. Everywhere else stays quiet. A tinted tile for every
  stat, or a rainbow across a header, is decoration: the eye stops sorting it, and the colour that
  does mean something gets lost in it.
- **Tokens are platform-neutral** in `packages/ui/tokens`, generated to CSS. Mobile comes later and
  inherits them.
- **Legible beats fashionable.** Body text never under 400 weight. 4.5:1 body, 3:1 UI, **7:1 on any
  station screen**. If a trend costs contrast or target size, the trend loses.
- **Motion clarifies, never decorates.** View Transitions for routes, skeletons not spinners,
  nothing animated on page load. `prefers-reduced-motion` means no motion, not less.
- **Every component ships all states**, a focus ring that is never removed, full keyboard operation,
  all three densities, light and dark, and an entry in the `/design` gallery.
- Refused outright: glassmorphism, hover-only affordances, toast-only errors, placeholder-as-label,
  modal stacking, icon-only buttons without labels, emoji as iconography.

## Working method

**One step at a time.** The user tests each deliverable before the next begins. Do not run ahead into
the next release. Finish a step, say plainly what to test and how, and stop.

**Work is tracked on the board in [BACKLOG.md](../BACKLOG.md).** Every deliverable is a story with an
ID. Pick it up by moving it to Active, and exactly one story is Active at a time. When the build is
done and its own tests pass, move it to Resolved, never to Closed. Resolved means "built, waiting to
be tested by a person". Only the person who tested it closes it. Update the board in the same commit
as the work, and put `Work item: HRT-n` in the commit footer. Nothing gets built that has no story;
scope found mid-build becomes a new row rather than a bigger one.

**Never build into a directory a running dev server is serving from.** Deleting or rebuilding `.next`
underneath `next dev` leaves its manifest pointing at chunks that no longer exist, and the page loads
with no CSS and no JS, which looks like a catastrophic bug and is not one. Scripted verification uses
`pnpm build:verify`, which writes to `.next-verify` through the `NEXT_DIST_DIR` env var. The same rule
applies to a verification dev server: give it its own dist directory and its own port.

## Writing style, applies to everything

These rules apply to code comments, docs, UI copy, commit messages, error messages, and chat replies.

- **No em dashes. Ever.** Use a comma, a period, a colon, parentheses, or restructure the sentence.
  Avoid en dashes too, including in numeric ranges. Write "50 to 500", not "50-500".
- **Use short comma-separated statement pauses for punch.** "Every feature, every church, every time."
  "It ships, or it does not." Short clauses, landing hard.
- **Do not repeat the pricing as a slogan.** The cost argument is made once, where it is evidence, and
  then the product is described by what it does. A word repeated becomes noise, and a product that
  keeps insisting it is cheap sounds like it has nothing else to say.
- **On screen, less. A field gets a label and, when it is wrong, an error. No hint text explaining
  what the field is for, no reassurance under a banner title, no lede restating the heading. Only a
  destructive confirmation earns a sentence, and it says what happens.**
- **The copy must be good.** Plain, confident, concrete. No filler, no marketing mush, no hedging.
  Write as though the reader is a busy pastor, not a procurement committee.
- Error messages tell the user what happened and what to do next. Never expose a stack trace to
  Maria.

## Commits

- Reference the PRD requirement ID where one applies: `feat(checkin): offline code ranges (R8.21)`.
- Conventional commit prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- **No tool attribution, co-author trailers, or generated-by lines** in commit messages or pull
  request descriptions.

## Where to look

| File | Contents |
|---|---|
| [PRD.md](../PRD.md) | Full specification, 23 domains, numbered requirements with acceptance criteria |
| [ROADMAP.md](../ROADMAP.md) | Release sequence 0.1 to 1.0, then Phase 2 |
| [architecture.md](architecture.md) | Stack, tenancy, offline check-in, sync contract |
| [data-model.md](data-model.md) | Entities, and the song schema in full |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to work on this |
