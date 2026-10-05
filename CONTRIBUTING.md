# Contributing

ConnectApp is church management software for small churches, funded by donations and licensed
[AGPL-3.0](LICENSE). Help is welcome.

> **Status: pre-alpha.** The specification is complete, the code is not started. The most useful
> contributions right now are the ones under "Before there is code" below.

## Start here

Read [PRD.md](PRD.md). It is the full specification: 23 domains, numbered requirements, acceptance
criteria. Then read [docs/engineering-guidelines.md](docs/engineering-guidelines.md), the short
version of how this project makes decisions and the rules that apply to every change.

Requirement IDs (`R8.6`, `R12.4`, `S2`) are the shared vocabulary. Use them in issues, branches, and
commits.

## Before there is code

The highest value contributions today:

- **Be a pilot church.** Three churches are needed for 0.2, and at least one has to be willing to run
  children's check-in on a pre-1.0 product. This is the single biggest blocker.
- **Review the check-in spec (PRD section 8.8)** if you run children's ministry. It is
  safety-critical and it is written from the outside. Tell us what it misses.
- **Review the giving spec (PRD section 8.13)** if you are a church treasurer or a CPA. Year end
  statements have to satisfy IRS Publication 1771, and getting that wrong in January is not
  recoverable.
- **Check the CCLI export columns (R12.10)** if you handle CCLI reporting for a church. The decision
  in PRD section 13.6 needs confirming against what CCLI actually accepts.
- **Review the design system** ([docs/design-system.md](docs/design-system.md)) if you design. The
  station rules in particular are written from the outside.

## What gets accepted

The scoping rule, from the PRD: **if a feature makes the product more powerful but less usable by a
non-technical volunteer, it is cut or deferred.** Rock RMS costs nothing and needs a developer. That
is the failure we are avoiding, and it is a failure of accumulated features, not of any single one.

Please check [PRD section 6](PRD.md) before proposing a feature. Some things are refused on purpose:
general ledger accounting, a website builder, native mobile apps, livestreaming, multi-site, a workflow
automation engine, and a custom report builder. Each has a reason listed.

Settled decisions, not open for relitigation: no paid tier ever, hosted SaaS only in v1, Stripe
Connect at a zero platform fee, bring-your-own email and SMS credentials, AGPL-3.0, and Supabase as
the platform. All recorded with reasoning in [PRD section 13](PRD.md).

## Non-negotiables

**Check-in is safety-critical (R8.x).** A defect here can cause physical harm to a child. Never weaken
an R8 requirement for implementation convenience, including the offline requirement. Raise it instead.

**Tenant isolation is Postgres RLS**, not application filtering. Every new table gets `tenant_id` and a
policy, and the adversarial cross-tenant test suite is a release gate.

**Field-level permissions are enforced at the query layer.** If data is hidden only by the template, it
is not hidden. Assume every consumer is the API.

**Accessibility is WCAG 2.2 AA.** A check-in station has to work for someone with a tremor and reading
glasses.

## Writing style

This applies to code comments, docs, UI copy, error messages, and commit messages.

- **No em dashes.** Use a comma, a period, a colon, or restructure. Avoid en dashes too, including in
  numeric ranges. Write "50 to 500", not "50-500".
- **Short comma-separated statement pauses.** "Every feature, every church, every time."
- **Do not repeat the pricing as a slogan.** Make the cost argument once, then describe the product by
  what it does.
- **Plain, confident, concrete.** No filler, no marketing mush, no hedging. Write as though the reader
  is a busy pastor.
- Error messages say what happened and what to do next. Never show a stack trace to a volunteer.

## Commits and pull requests

- Conventional prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Reference the requirement ID: `feat(checkin): offline code ranges (R8.21)`.
- One logical change per pull request.
- **No AI or generated-by attribution** in commit messages or pull request descriptions.

## Licence

Contributions are made under [AGPL-3.0](LICENSE). There is no CLA. The licence is what keeps the
pricing true rather than promised, so it will not be changed.
