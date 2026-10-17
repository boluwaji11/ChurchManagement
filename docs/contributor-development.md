# Contributor development

How to get ConnectApp running, and how to get access to the hosted development environment if you
need it.

Most contributions need only the local setup. The hosted environment exists for work that is hard to
judge on a laptop: a published church website on a real domain, an email that actually sends, a
Stripe flow against a sandbox account, or a check-in station on a tablet.

## Local development

The verified steps are in the [README](../README.md#getting-started). In short:

```bash
git clone https://github.com/boluwaji11/ConnectApp.git
cd ConnectApp
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

You will need:

- Node.js 22, which is what CI uses. `.nvmrc` pins it.
- pnpm 10.18.3, pinned in `package.json` and installed by `corepack enable`.
- A PostgreSQL 15 or later database. A free Supabase project is the easiest, and
  [environments.md](environments.md) explains which variables it needs.

Then:

```bash
pnpm db:migrate      # migrations, then the search and security layers
pnpm db:seed         # two churches, which is what makes isolation demonstrable
pnpm db:seed:users    # the accounts to sign in with
pnpm dev             # web on 4488, administration portal on 4489
```

`.env.example` lists every variable with a comment saying what it is for. Several are optional: with
no Stripe keys the giving screens say so rather than failing, and with no email key nothing sends and
the screens say so. You can get a long way with only the database configured.

The seeded accounts all take their password from `SEED_USER_PASSWORD` in `.env.local`, and
[environments.md](environments.md) lists which account is which.

### Validating a change

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm catalogue       # then check that nothing changed
pnpm build
```

The database suite needs a running development database. Everything else runs without one.

Then open it in a browser, which catches what typechecking does not:

```bash
pnpm --filter @connectapp/web build && pnpm --filter @connectapp/web start
node scripts/browser-check.mjs /dashboard /members /settings/teams
```

`scripts/browser-check.mjs` signs in through Playwright and reports anything thrown or logged, failed
requests, the heading it found, the timing, and where the screenshot landed.

## The hosted development environment

ConnectApp runs a development environment at **https://dev.connectapp.church**, with the
administration portal at **https://dev-admin.connectapp.church**.

It runs the same code as the product, deployed from `main`, against a separate Supabase project. It
holds seeded churches and no real church records. Every screen on it carries a Sandbox bar across the
top, so there is never a question about which environment you are looking at.

It is gated: the site requires a sign-in and checks you against the ConnectApp team list before it
serves anything. That is why access is a decision rather than a link.

### Requesting access

Email **support@connectapp.church** and include:

- Your GitHub username.
- A brief introduction.
- The area you want to contribute to.
- Why sandbox access would help, meaning what you cannot judge locally.

Access is reviewed and granted by the ConnectApp team. We will say yes or no, and if no, we will say
what would change the answer.

What access does not include: the production environment, any real church's records, or the platform's
own credentials. There is nothing to ask for there.

## Responsible testing

The development environment and the seed data are shared, so treat them as shared.

- Use development accounts and synthetic data. Never paste a real person's details into a seeded
  church, and never a real church's name or domain into a placeholder or a test.
- Respect the permissions you were given. If a screen refuses you, that is the product working.
- Do not export, copy or keep development data beyond what the task needs.
- Never commit credentials, and never put one in an issue, a pull request, a screenshot or a log.
  If you expose one by accident, say so immediately: rotating a development key is a two-minute job
  and a silent exposure is not.
- Do not run load tests, scanners or denial of service attempts against any hosted environment.
- Never test against production or against a real church's data. There is no authorization available
  for that.
- Found a security problem? Follow [SECURITY.md](../SECURITY.md) and do not open a public issue.

## Contributing changes

External contributors work through pull requests, which the maintainer reviews and merges. The
repository has a ruleset requiring that review by name.

Keep a change focused, say how you tested it, and say whether it touches the database or
authorization. The full expectations are in [Contributing](../CONTRIBUTING.md), and the technical
standard is in [engineering-guidelines.md](engineering-guidelines.md).

Before you start something substantial, open an issue or a discussion. The board in
[BACKLOG.md](../BACKLOG.md) is the authority on what is being worked on, and it will save you
building something that is already in progress.
