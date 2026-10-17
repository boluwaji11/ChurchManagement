# Contributing to ConnectApp

Thank you for your interest in ConnectApp.

We are building free, open-source church management software designed to help churches spend less
time on administration and more time serving people.

Thoughtful contributions are welcome.

## How you can contribute

You can help by:

- Reporting bugs.
- Suggesting improvements.
- Reviewing church workflows.
- Improving accessibility.
- Contributing code.
- Improving documentation.
- Testing features.
- Helping make the application easier to use.

For substantial changes, start with a GitHub Issue or Discussion. The discussion templates cover
questions, ideas, migration help, and showing what you have built.

Two kinds of review are worth more than code right now, because both are written from outside the
churches they serve:

- **Children's check-in** (PRD section 8.8), if you run children's ministry. It is safety-critical.
- **Year-end giving statements** (PRD section 8.13), if you are a church treasurer or a CPA. They
  have to satisfy IRS Publication 1771, and getting that wrong in January is not recoverable.

## Development setup

Follow the [Getting Started](README.md#getting-started) instructions.

You will need Node.js 22, pnpm 10.18.3, and a PostgreSQL database for the schema and the seed.

Additional guidance is in [docs/environments.md](docs/environments.md) and
[docs/contributor-development.md](docs/contributor-development.md).

## Development environment

ConnectApp maintains a hosted development environment at:

https://dev.connectapp.church

It runs the same code as the product, against a separate database holding seeded churches and no
real church records. It is where a change can be seen working before it reaches anybody.

Contributors who need access can request it by emailing:

support@connectapp.church

Please include your GitHub username, a brief introduction, what you plan to work on, and why
sandbox access would help. Access is reviewed and granted by the ConnectApp team, and the
environment requires a sign-in, so a request is a real decision rather than a formality.

Local development is fully supported through the repository setup instructions, and most
contributions never need the hosted environment at all.
[docs/contributor-development.md](docs/contributor-development.md) covers both.

## Before making changes

Read:

- [Engineering Guidelines](docs/engineering-guidelines.md)
- [UX Writing Guide](docs/ux-writing.md)
- [Design System](docs/design-system.md)
- [Architecture](docs/architecture.md)
- [Project Backlog](BACKLOG.md)

Check existing Issues and Discussions to avoid duplicating work.

Requirement IDs (`R8.6`, `R22.3`) and story IDs (`HRT-367`) are the shared vocabulary. Use them in
issues, branches, and commits.

## Engineering standards

Contributions should:

- Follow existing architecture.
- Preserve tenant isolation, which is enforced by PostgreSQL row-level security and never by
  application filtering. Every new table gets `tenant_id` and a policy.
- Respect authorization, which is enforced at the query layer rather than in the view.
- Reuse shared components from `packages/ui`.
- Maintain accessibility to WCAG 2.2 AA, which CI audits.
- Follow localization conventions. Every user-facing string lives in `packages/i18n`, and a test
  fails the build on copy written inline.
- Include appropriate tests. A new table or role predicate arrives with an isolation test.
- Preserve existing functionality.
- Update documentation when needed.

Archive rather than delete. Records come off active lists and are kept.

## What gets accepted

The scoping rule: **if a feature makes the product more powerful but less usable by a non-technical
volunteer, it is cut or deferred.** Rock RMS costs nothing and needs a developer. That is the failure
we are avoiding, and it comes from accumulated features rather than from any single one.

Check [PRD section 6](PRD.md) before proposing a feature. Some things are refused on purpose, each
with a reason recorded: general ledger accounting, native mobile apps, livestreaming, multi-site and
denominational rollups, a workflow automation engine, and a general-purpose website builder for
anything other than a church's own site.

Settled decisions, recorded with reasoning in [PRD section 13](PRD.md): no paid tier ever, hosted
SaaS only in v1, Stripe Connect at a zero platform application fee, bring-your-own email and SMS
credentials, AGPL-3.0, and Supabase as the platform.

## Non-negotiables

**Check-in is safety-critical.** A defect here can cause physical harm to a child. Never weaken an
R8 requirement for implementation convenience, including the requirement that it keeps working with
no network. Raise it instead.

**Tenant isolation is PostgreSQL row-level security.** The adversarial cross-tenant test suite is a
release gate.

**Field-level permissions are enforced at the query layer.** If data is hidden only by the template,
it is not hidden. Assume every consumer is the API.

**The audit log is append only** and cannot be modified by any application role, including the
church's owner.

## Writing

Product copy, documentation, comments and commit messages all follow
[docs/ux-writing.md](docs/ux-writing.md) and the code comment standard in
[docs/engineering-guidelines.md](docs/engineering-guidelines.md). The short version:

- Write naturally. Use the words a thoughtful person would use.
- Say what happened and what to do next.
- **No em dashes and no en dashes**, anywhere, including numeric ranges. Write "50 to 500". CI checks
  this.
- A church does not only meet on Sunday. Write "a service" or "service day".
- Error messages say what happened and what to do next, and never show a stack trace to a volunteer.

## Pull requests

Keep changes focused and reviewable.

Explain:

1. What changed.
2. Why it changed.
3. How it was tested.
4. Whether database changes are involved.
5. Whether security or authorization behavior changed.

External contributors should use pull requests for review. One logical change per pull request.

Commits use conventional prefixes (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`) and reference
the requirement ID where one applies: `feat(checkin): offline code ranges (R8.21)`.

**No AI or generated-by attribution** in commit messages or pull request descriptions.

## Security

Do not include credentials, secrets, or real church records in contributions.

Use synthetic development data. The seed produces two churches for exactly this reason.

Report security concerns privately according to [SECURITY.md](SECURITY.md). Do not open a public
issue for a vulnerability.

## License

Contributions are distributed under the repository's [AGPL-3.0 license](LICENSE). There is no CLA.
The license is what keeps the pricing true rather than promised, so it will not be changed.
