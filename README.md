# ConnectApp

[![CI](https://github.com/boluwaji11/ConnectApp/actions/workflows/ci.yml/badge.svg)](https://github.com/boluwaji11/ConnectApp/actions/workflows/ci.yml)

**Free church management software, built for the people who serve.**

[ConnectApp.church](https://connectapp.church) is a free, open-source platform that helps churches
manage their people, organize ministry, plan services, communicate with their congregations, and
build their online presence.

We are building ConnectApp for churches that rely on small teams and volunteers. Churches deserve
thoughtful, dependable software that is easy to learn and a pleasure to use.

Every platform feature is free. There are no subscriptions, paid tiers, or per-member charges.
Third-party providers may charge their own fees.

> **Status: in development, before the first church.** The platform is substantially built and we use
> it internally. No church is running on it yet, so the schema still moves and screens still change.
> [BACKLOG.md](BACKLOG.md) carries every deliverable and its state,
> [docs/repository-inventory.md](docs/repository-inventory.md) says what each area actually is today,
> and [ROADMAP.md](ROADMAP.md) is the release criteria.

## Why ConnectApp exists

Running a church involves more administration than most people realize.

Membership records, children's check-in, volunteer scheduling, attendance, events, communication,
and giving can consume hours every week.

Smaller churches often manage these responsibilities with spreadsheets, disconnected tools, and
software that requires more time or money than they can comfortably spare. Verified in September
2026, the established products start at $72 a month and reach $239 a month charged per module, and a
presenter, a website and a bulk email tool are usually separate again.

Zero-cost options exist and they assume a technical person the target church does not have. Rock RMS
is open source and needs a Windows and .NET developer. ChurchCRM is self-hostable with a dated
interface.

ConnectApp brings these everyday responsibilities into one connected platform.

Our goal is to make church administration simple enough for a volunteer to manage, while giving
churches the tools they need to serve their communities well.

## What ConnectApp helps churches do

### People and households

Organize member profiles, households, relationships, and relevant church records, with tags, custom
fields, duplicate merging, and import and export.

### Attendance and check-in

Track attendance and support children's ministry check-in, including matching security codes,
authorized pickup, allergy alerts, room ratios, and continued operation when the network drops.

### Groups and ministries

Organize groups, manage participation, and help people connect through a public group finder with
leader-approved join requests.

### Volunteers and services

Coordinate serving teams, schedules with conflict detection, and service plans with running times
and templates.

### Events and forms

Create events, manage registrations and waitlists, and collect information through forms.

### Communication

Connect a supported email provider and communicate with the congregation, with targeting, templates,
delivery status, bounce handling, and consent.

### Giving

Manage contributions and support online giving through the church's own Stripe account, with funds,
campaigns, cash and cheque batches, payouts, and year-end statements.

### Church websites

Create and publish a church website using a visual editor, customizable layouts, and reusable
sections.

### Member experience

Give members access to their household, groups, events, giving, and serving requests through an
installable member portal.

### Administration

Support church onboarding, account management, permissions, and operational oversight through a
separate platform administration portal.

ConnectApp is under active development. Features may require additional testing or release
validation before becoming available to churches.

## A website that belongs to your church

A church's website is often the first place someone encounters its ministry.

ConnectApp includes a website builder designed to help churches create and maintain websites without
web development experience.

The builder includes reusable sections, visual editing, responsive layouts, revisions, and publishing
tools, and a church can connect its own domain.

See [Website Builder Documentation](docs/website-builder.md).

## Built for everyday ministry

ConnectApp is guided by five principles:

- **Easy to learn:** Everyday tasks should be understandable to volunteers.
- **Thoughtfully designed:** Clear interfaces and accessible interactions matter.
- **Connected:** Church information should flow naturally between relevant tools.
- **Secure:** Sensitive information requires appropriate protection and access control.
- **Free:** Churches should have access to the platform without subscription charges.

The interface is one design system in three densities: a dense, keyboard-first layout for an
administrator at a desk, a kiosk layout for a check-in station at 56px targets and 7:1 contrast, and
an app-like layout for members on a phone. Accessibility is WCAG 2.2 AA and audited in CI. Details in
[docs/design-system.md](docs/design-system.md).

## How it is paid for

- **Donations and grants.** No paid tier, no enterprise edition, no per-seat charges.
- **We never hold your money.** Giving runs through the church's own Stripe account with a platform
  application fee of zero. Stripe charges its own processing fee directly to the church.
- **Bring your own email and SMS.** A church supplies its Resend, SMTP or Twilio credentials and we
  send through them. ConnectApp does not resell messaging credits.
- **Storage quotas are enforced and visible.** Sermon video belongs on a video host.
- **AGPL-3.0.** Read the code, run the code, fork the code.
- **Export everything, at any time.** No plan gate and no support ticket.
- **We do not train models on church data**, and no processor is permitted to either.

## Technology

ConnectApp is a TypeScript monorepo built with pnpm workspaces and Turborepo.

Its technology includes:

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL, with row-level security as the tenant isolation boundary
- Drizzle ORM
- Tailwind CSS
- Shared UI components and design tokens
- Localization infrastructure
- Stripe Connect integrations
- Automated testing and CI

See [Architecture](docs/architecture.md) for additional detail.

## Getting started

### Prerequisites

- Node.js 22, which is what CI uses
- pnpm 10.18.3, pinned in `package.json`
- A Supabase project, or any PostgreSQL 15 or later database, for the schema and the seed

### Clone

```bash
git clone https://github.com/boluwaji11/ConnectApp.git
cd ConnectApp
```

### Install

```bash
corepack enable
pnpm install --frozen-lockfile
```

### Configure

```bash
cp .env.example .env.local
```

Follow [Environment Setup](docs/environments.md) for configuration. `.env.example` lists every
variable with a comment saying what it is for and whether it is required.

### Database setup

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:seed:users
```

These commands require a correctly configured development database. `db:migrate` applies the
migrations and then reapplies the full-text search and security layers. `db:seed` writes two
churches, which is what makes tenant isolation demonstrable. `db:seed:users` adds the accounts to
sign in with.

### Run

```bash
pnpm dev
```

The web application serves on port 4488 and the administration portal on 4489. Override with
`PORT=5000 pnpm dev`.

### Validate

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The database suite needs a running development database. Everything else runs without one.

## Repository layout

```
apps/web                  The product: staff screens, the member portal, public church sites
apps/admin                The platform administration portal
packages/db               Drizzle schema, RLS policies, repositories, isolation tests
packages/db/sql           The security layer: app role, policies, grants, audit triggers
packages/ui               Design tokens, the token generator, shared components
packages/ui/tokens        Platform-neutral token source. Web CSS is generated from it
packages/i18n             The message catalogue, and the typed t() and plural() readers
packages/mail             Transactional email
packages/env              Environment declaration and the credential guard
docs/                     Architecture, data model, design system, operations
```

`pnpm tokens` regenerates `packages/ui/src/tokens.css` from the JSON in `packages/ui/tokens`.
Colours, type sizes and motion durations are edited there and nowhere else.

## Contributing

ConnectApp welcomes contributions from developers, designers, church administrators, ministry
leaders, and volunteers.

Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started, and
[docs/contributor-development.md](docs/contributor-development.md) for how development works.

Approved contributors can request access to our development environment at
[dev.connectapp.church](https://dev.connectapp.church) by emailing
[support@connectapp.church](mailto:support@connectapp.church).

## Documentation

Start with [docs/README.md](docs/README.md).

Additional references:

- [Roadmap](ROADMAP.md)
- [Product Requirements](PRD.md)
- [Engineering Guidelines](docs/engineering-guidelines.md)
- [UX Writing](docs/ux-writing.md)
- [Architecture](docs/architecture.md)
- [Website Builder](docs/website-builder.md)
- [Security](SECURITY.md)

## License

ConnectApp is licensed under the
[GNU Affero General Public License version 3](LICENSE).
