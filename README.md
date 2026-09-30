# Sanctuary

**Church management software. No pay, always free.**

Sanctuary is a complete church management platform given to churches at no cost. Not a trial, not a
free tier, not a loss leader for an upsell. Every feature, every church, every time.

Phase 2 adds **Sanctuary Stage**, a worship presenter that replaces ProPresenter and already knows
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

Free options exist. They do not work. Rock RMS is free, open source, and needs a Windows and .NET
developer. ChurchCRM is free with a dated interface. Both assume a technical person the target
church does not have.

**Free software for churches exists. Easy software for churches exists. Nothing is both.**

Sanctuary is Rock RMS's price with Breeze's usability.

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

## How free stays free

A free platform without a funding model dies in eighteen months and takes its churches' data with it.
So the model is part of the design.

- **Funded by donations and grants.** No paid tier. No enterprise edition. No per-seat anything.
- **We never touch your money.** Giving runs through your own Stripe account with a platform fee of
  zero. Funds go from the giver to your Stripe account to your bank. Giving through Sanctuary costs
  less than Tithe.ly, because there is no margin stacked on top.
- **Bring your own email and SMS.** You supply your Resend, SMTP, or Twilio credentials and we send
  through them. This is why we can afford to be free.
- **Storage quotas are real and visible.** Sermon video belongs on YouTube.
- **Support is a community forum**, not an inbox. That is what a donation-funded platform can carry.

## Why you can trust it

Promises are cheap, so these are structural instead.

- **AGPL-3.0.** Read the code, run the code, fork the code. A closed commercial fork is not possible.
- **Export everything, one click, any time.** No plan gate, no support ticket. The exit is the trust.
- **A published wind-down commitment.** If we ever stop, you get ninety days' notice, final exports,
  and the self-host guide.
- **We never train models on your data.** Contractual, and no processor is permitted to either.
- **Nonprofit governance** for the hosted service.

## Documentation

| | |
|---|---|
| [PRD.md](PRD.md) | Full specification, 23 domains with numbered requirements |
| [ROADMAP.md](ROADMAP.md) | Release plan, 0.1 through 1.0, then Phase 2 |
| [docs/architecture.md](docs/architecture.md) | Stack, tenancy, offline check-in, presenter sync |
| [docs/data-model.md](docs/data-model.md) | Entities, and the song schema in full |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to help |
| [CLAUDE.md](CLAUDE.md) | Instructions for AI coding agents in this repo |

## Licence

[AGPL-3.0](LICENSE). Free forever, and the licence is what makes that true.
