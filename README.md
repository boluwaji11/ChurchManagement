# Hearth

**Church management software a volunteer can run.**

Hearth is a complete church management platform for small churches, given to them at no cost. Every
feature, every church, every time. No modules, no tiers, no upsell.

Phase 2 adds **Hearth Stage**, a worship presenter that replaces ProPresenter and already knows
what is happening on Sunday, because it reads the same service plan and the same song library.

> **Status: pre-alpha.** The specification is complete, the code is not started. Read
> [PRD.md](PRD.md) for the full picture.

## Why this exists

Church software is priced as if every church has a budget. Verified September 2026:

| Product | Price |
|---|---|
| Breeze | $72/mo |
| Tithe.ly | $72/mo, $119/mo bundled |
| Planning Center | Up to $239/mo, charged per module across nine products |
| ProPresenter | $289/yr per seat, plus $199/yr for content |

And the subscription is not the real cost. Online giving carries roughly 2.9% plus 30 cents, so a
church receiving $40,000 a month online pays about $1,200 a month in processing fees. Add a
presenter, a website, a bulk email tool, and a church app, and a two hundred member congregation is
carrying five subscriptions and a four figure annual software line.

Zero-cost options exist. They do not work. Rock RMS is open source and needs a Windows and .NET
developer. ChurchCRM is self-hostable with a dated interface. Both assume a technical person the
target church does not have.

**Software churches can afford exists. Software churches can use exists. Nothing is both.**

Hearth is Rock RMS's price with Breeze's usability.

## Who it is for

Churches of 50 to 500 weekly attendance, with zero to two paid staff, run by a volunteer
administrator or a part time secretary.

Not for multi-site churches, congregations over 2,000, or denominational rollups. Those churches have
budgets, and excluding them is what makes shipping possible.

## What it does

| | |
|---|---|
| **People** | Individuals, households, relationships, milestones, custom fields, duplicate merge |
| **Directory** | Member-facing, per-field privacy controlled by the member, printable |
| **Check-in** | Children's check-in with matching security codes, authorised pickup, allergy alerts, room ratios, and it keeps working when the wifi drops |
| **Attendance** | Headcount or individual, visitor flagging, absence detection |
| **Giving** | Stripe Connect on your own account at a **zero** platform fee, cash and cheque batches, pledges, and IRS-compliant year end statements |
| **Groups** | Group finder, join requests, leader-scoped access, attendance in under a minute on a phone |
| **Volunteers** | Scheduling with conflict detection, blockout dates, accept and decline, substitute swaps, background check gating |
| **Service planning** | Order of service with running time, notes per position, templates, live mode |
| **Songs** | Presenter-grade library with arrangements, sequences, ChordPro charts, and CCLI usage reporting |
| **Events** | Registration, waitlists, family sign-up, discount codes |
| **Calendar** | Room and resource booking with conflict detection and facility use approvals |
| **Communication** | Email and SMS through your own provider, print letters and mailing labels |
| **Portal** | A PWA for members: give, join a group, accept a serving request, check your kids in |
| **Reports** | Twenty canned reports including a first-time visitor conversion funnel |

Full requirements in [PRD.md](PRD.md). Release order in [ROADMAP.md](ROADMAP.md).

## How it is paid for

A platform with no revenue and no funding model dies in eighteen months and takes its churches' data
with it. So the model is part of the design.

- **Funded by donations and grants.** No paid tier, no enterprise edition, no per-seat anything.
- **We never touch your money.** Giving runs through your own Stripe account with a platform fee of
  zero. Funds go from the giver to your Stripe account to your bank, which costs you less than
  Tithe.ly, because there is no margin stacked on top.
- **Bring your own email and SMS.** You supply your Resend, SMTP, or Twilio credentials and we send
  through them. That is what keeps our costs low enough to carry.
- **Storage quotas are real and visible.** Sermon video belongs on YouTube.
- **Support is a community forum**, not an inbox. That is what a donation-funded platform can carry.

## Why you can trust it

Promises are cheap, so these are structural instead.

- **AGPL-3.0.** Read the code, run the code, fork the code. A closed commercial fork is not possible,
  which is what makes the pricing a property of the licence rather than a promise.
- **Export everything, one click, any time.** No plan gate, no support ticket. The exit is the trust.
- **A published wind-down commitment.** If we ever stop, you get ninety days' notice, final exports,
  and the self-host guide.
- **We never train models on your data.** Contractual, and no processor is permitted to either.
- **Nonprofit governance** for the hosted service.

## What it looks like

Every competitor is a blue SaaS dashboard, grey on grey, one accent colour, no joy. Hearth uses a
warm canvas and eight hues that do real work: every room, team, group type, fund, and ministry owns
one, so a calendar, a check-in floor, and a giving chart are readable at a glance instead of after
reading. Your check-in room's colour prints on the child's label, so a volunteer can point a parent
to the teal room without reading a word. Everywhere that colour would not mean anything, there
isn't any.

One design system, three densities. **Office** is dense and keyboard-first for the admin at a desk.
**Station** is a Sunday kiosk with 56px targets, 20px text, and 7:1 contrast, because 09:58 on a
Sunday with forty families queuing is the hardest screen in church software. **Portal** is app-like on
a phone for members.

And it is accessible because volunteers span every age and ability, not because a standard says so.
Body text never under 400 weight, a focus ring that is never removed, and reduced motion means no
motion. WCAG 2.2 AA is the floor.

Details in [docs/design-system.md](docs/design-system.md).

## Built with

TypeScript end to end. Next.js App Router, **Supabase** for Postgres, auth, and storage, with Postgres
row-level security as the tenant isolation boundary. Drizzle, Tailwind CSS v4, shadcn/ui on Radix,
Lucide icons, Motion. Stripe Connect at a zero platform fee. A PWA for members now, native later.
Phase 2's presenter is Electron sharing the song library code with the web app.

## Running it

Nothing but the design system exists yet, and that is the point: it is the only thing reviewable
before any feature is built, and three density modes cannot be retrofitted onto finished screens.

```bash
pnpm install
cp .env.example .env.local     # fill in your Supabase project
pnpm db:migrate                # tables, RLS policies, audit triggers
pnpm db:seed                   # two churches, so isolation is demonstrable
pnpm dev                       # http://localhost:4488
pnpm test                      # the cross-tenant isolation suite
```

Port 4488, because 3000 and 3001 are crowded. Override it with `PORT=5000 pnpm dev`.

No database, no keys, no accounts. Supabase arrives with the next step.

```
apps/web              Next.js app. The /design gallery and /people live here.
packages/ui           Design tokens, components, the token generator.
packages/ui/tokens    Platform-neutral token source. Web CSS is generated from it.
packages/db           Drizzle schema, RLS policies, repositories, isolation tests.
packages/db/sql       The security layer: app role, policies, grants, audit triggers.
```

`pnpm tokens` regenerates `packages/ui/src/tokens.css` from the JSON in `packages/ui/tokens`. Colours,
type sizes, and motion durations are edited there and nowhere else.

## Documentation

| | |
|---|---|
| [PRD.md](PRD.md) | Full specification, 23 domains with numbered requirements |
| [ROADMAP.md](ROADMAP.md) | Release plan, 0.1 through 1.0, then Phase 2 |
| [BACKLOG.md](BACKLOG.md) | The board: what is being built right now, and what is done |
| [docs/architecture.md](docs/architecture.md) | Stack, tenancy, offline check-in, presenter sync |
| [docs/data-model.md](docs/data-model.md) | Entities, and the song schema in full |
| [docs/design-system.md](docs/design-system.md) | Tokens, colour, type, motion, components, station rules |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to help |
| [docs/engineering-guidelines.md](docs/engineering-guidelines.md) | Decisions, constraints, and rules for every change |

## Licence

[AGPL-3.0](LICENSE).
