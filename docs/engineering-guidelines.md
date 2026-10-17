# Engineering guidelines

Technical standards for every change in this repository.

Product decisions and the constraints that flow from them are in [CLAUDE.md](../CLAUDE.md). Product
language is in [ux-writing.md](ux-writing.md). Visual and interaction standards are in
[design-system.md](design-system.md). System shape is in [architecture.md](architecture.md). This
document is the engineering half: how code in here is expected to behave.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript end to end, strict |
| Monorepo | pnpm workspaces plus Turborepo |
| Web | Next.js App Router, React |
| Data | Supabase Postgres, Drizzle ORM |
| Auth | Supabase Auth for authentication, our own tables for authorization |
| Storage | Supabase Storage, private buckets with signed URLs |
| Styling | Tailwind CSS v4 over generated design tokens |
| Components | shadcn/ui on Radix, Lucide icons |
| Payments | Stripe Connect, zero platform application fee |
| Email | The church's own Resend or SMTP credentials |
| Background work | A durable job queue in Postgres |
| Members | A PWA |

Applications:

| Path | What it is | Deploys to |
|---|---|---|
| `apps/web` | The product: staff screens, the member portal, public church sites | `connectapp.church` |
| `apps/admin` | The platform admin portal, for the ConnectApp team | `admin.connectapp.church` |

Packages:

| Path | What it is |
|---|---|
| `packages/db` | Drizzle schema, RLS policies, repositories, the SQL security layer, isolation tests |
| `packages/ui` | Design tokens, the token generator, every shared component, the contrast audit |
| `packages/i18n` | The message catalogue, `t`, `plural`, spelling and region resolution |
| `packages/mail` | Transactional email markup and the send path |
| `packages/env` | Environment declaration and the credential guard |

## Data access

**Drizzle against Postgres directly.** Never the auto-generated PostgREST API, because field-level
permissions belong in our query layer.

**Connect as a role RLS applies to**, and set `app.tenant_id` per transaction. The pattern is in
`packages/db/src/client.ts`; use the existing helpers rather than opening a connection.

**The service role key never appears in a request path.** Only the job worker holds it.

**Realtime is unused in v1.**

### Tenant isolation

Isolation is enforced by Postgres row-level security, not by application filtering. Application-layer
filters are a convenience and never a control.

- Every new table gets `tenant_id` and a policy.
- The policy reads `app.tenant_id`, which the transaction set.
- `packages/db/sql/security.sql` holds the app role, the policies, the grants and the audit triggers,
  and is reapplied by `pnpm db:migrate`.
- The adversarial cross-tenant suite in `packages/db/tests` is a release gate and runs in CI.

A table whose name begins `platform_` belongs to the platform rather than to a church, carries no
`tenant_id`, and is excluded from the audit trigger loop in `security.sql`.

### Field-level permissions

Enforced at the query layer. A query made under a role that may not see an amount returns the record
without the amount field present. Never rely on the view layer to hide data, because the API is a
consumer too.

Role checks live beside the data in `packages/db/src/roles.ts` and the repositories, as named
predicates (`canManageChurch`, `canManageGiving`). Screens call the same predicates, so one rule has
one implementation.

### Records

- **Archive, never hard delete.** Set `archived_at`. True deletion happens only through the DSAR
  path.
- **Every destructive action is reversible or confirmed.** Merges are reversible for 30 days, imports
  are rollback-able for 30 days.
- **The audit log is append only** and cannot be modified by any application role, including Owner.
- An archived row stays readable by the paths that need history, and comes off every active list.

## Migrations

- Generated with `drizzle-kit` into `packages/db/migrations`, with the journal and snapshots
  committed.
- **Written once and applied to development first**, because that is where it is allowed to be wrong.
- **Zero downtime.** Add a column nullable, backfill, then constrain. Never a destructive change in a
  single step.
- Never edit a migration that has been applied anywhere. Write another one.
- Never delete a migration, a snapshot, or the journal.
- `sql/search.sql` and `sql/security.sql` are reapplied on every migrate run and must be idempotent.

## Internationalization

Every user-facing string lives in `packages/i18n/src/messages/en.ts` and is read with `t("key")`.

- Keys are typed against the catalogue, so a typo is a compile error rather than a blank space on a
  screen.
- `packages/i18n/tests/no-hardcoded-strings.test.ts` walks the screens and fails the build on copy
  written inline. The `/design` gallery is exempt, and the exemption list in that test is the record
  of every other exception.
- **A number in a sentence takes `plural("stem", n)`**, with a `.one` and an `.other` entry. The
  singular is written out rather than interpolated.
- The browser's catalogue is generated. Run `pnpm catalogue` after changing messages, and commit the
  result. CI fails if it is stale.
- Dates, numbers and money are formatted from the church's country, resolved on the server and again
  in the browser. Never from the reader's browser locale.
- Spelling (`organise` against `organize`) is resolved per church through `spellingFor`.

## Design tokens

Tokens are platform-neutral JSON in `packages/ui/tokens`, generated to CSS by `pnpm tokens`. Colours,
type sizes and motion durations are edited there and nowhere else. CI fails if the generated CSS is
stale.

## Performance

A feature is finished when it works and is quick. Ask the same questions of every new screen, list,
filter, search and write:

- How many round trips does it make?
- Are the independent ones sent together?
- What is read on every press that could be read once?
- What can be held, and for how long?

A filter or a search runs over the database with an index behind it rather than over rows pulled into
memory. A count comes back as a count rather than as a list that gets measured.

`OBSERVE_EVERY_QUERY=1` prints a line for every transaction with the address, the church and the
milliseconds. Numbers are measured against a build, never a dev server, and go in the commit message
and the backlog entry: time to first byte, the whole screen, and what it was before. Recorded in
[performance.md](performance.md).

## Accessibility

WCAG 2.2 AA, audited in CI.

- 4.5:1 body, 3:1 UI, **7:1 on any station screen**. The contrast audit in `packages/ui` is a CI job.
- A focus ring that is never removed, and full keyboard operation for every component.
- `prefers-reduced-motion` means no motion.
- Every icon-only control carries a label that becomes its accessible name and its tooltip.
- A check-in station has to work for someone with a tremor and reading glasses.

## Testing

| Suite | Where | What it protects |
|---|---|---|
| Isolation and authorization | `packages/db/tests` | Cross-tenant reads and writes, role predicates, hardening |
| Contrast | `packages/ui` | Every token pair against its required ratio |
| Catalogue and copy | `packages/i18n/tests` | Keys resolve, plurals exist, no inline strings |
| Domain logic | beside the code | Repositories, rules, parsers |
| Browser | `scripts/browser-check.mjs` | A real sign-in and a real render, against a build |

A new table or a new role predicate arrives with an isolation test. A new screen arrives with a
browser check.

## Verifying a change

```
pnpm typecheck
pnpm lint
pnpm test
pnpm catalogue        # then check nothing changed
pnpm build
```

Then open it:

```
pnpm --filter @connectapp/web build && pnpm --filter @connectapp/web start
node scripts/browser-check.mjs /dashboard /members /settings/teams
```

**Never build into a directory a running dev server is serving from.** Deleting or rebuilding `.next`
underneath `next dev` leaves its manifest pointing at chunks that no longer exist, and the page loads
with no CSS and no JS. Scripted verification writes to its own directory through `NEXT_DIST_DIR`. A
verification dev server gets its own dist directory and its own port.

Prefetching on hover and streaming both behave differently under `next dev`, so anything about
perceived speed is measured against a build.

## Environments

Two of everything, so that working on ConnectApp cannot reach a church. The full account is in
[environments.md](environments.md).

- The environment is **declared, never inferred**: `CONNECTAPP_ENV`, then Vercel's `VERCEL_ENV`, then
  development. `NODE_ENV` is not consulted.
- `assertEnvironment()` runs from each app's `next.config.ts`. A production credential outside
  production stops the process. A development credential inside production is logged and drawn on the
  admin portal's status screen.
- Development and production hold separate Supabase projects, Stripe accounts and Resend keys.
- Every screen outside production carries a bar across the top of the window saying which environment
  it is.
- `vercel env add ... production` during development work is the one command that reaches a church.

## Deploys

- **No deploys during a church's service window**, 07:00 to 14:00 local on its own service days.
- `main` deploys to the development environment. `production` is moved forward from `main` when
  asked, and is never worked from or committed to.
- A migration is applied to production before the commit that needs it is moved forward.
- CI runs on `main`. Check it per job rather than per run.

## Secrets

- Never committed. `.env.local` and `.env.production.local` are gitignored, and `.env.example`
  carries the names with no values.
- Never printed into a log, an error message, a test fixture or a commit.
- A credential read from a screenshot is retyped by the owner rather than transcribed, and verified
  against the service before it is stored.
- A rotated credential is replaced everywhere it was set, including Vercel, in the same change.

## Code style

- TypeScript strict. No `any` where a type can be written. No non-null assertion to silence a real
  possibility.
- Server components by default. `"use client"` only where interaction needs it.
- One exported thing per concern, named for what it is rather than for its shape.
- Match the surrounding file's idiom and naming.
- No em dashes and no en dashes in comments or commit messages. CI checks this.

## Code comments

Comments are written for the next developer reading the code. They carry the purpose, the
constraints, and the reasoning that the code itself cannot.

The goal is not fewer comments. It is better ones.

### What a comment is for

Write one when it answers a question the code does not:

- Why was this approach chosen over the obvious one?
- What invariant has to stay true?
- What security boundary is being enforced here?
- What happens in an edge case that is not visible from the signature?
- Why does this workaround exist, and when can it go?
- What behaviour has to stay compatible, and with what?
- What would break if this were implemented differently?

### Technical clarity over storytelling

Use direct technical language. Avoid narrative, rhetorical flourishes, metaphors, and conversational
explanation.

| Instead of | Write |
|---|---|
| `// The database the whole product is.` | `// Check database availability.` |
| `// A probe that cannot answer in time answers anyway.` | `// Return a fallback status when a probe exceeds its timeout.` |
| `// Which of the theme's two button languages it speaks.` | `// Button appearance: primary, secondary, or quiet.` |

### Do not restate the code

```ts
// Set loading to true
setLoading(true);
```

Delete that. Keep the comment when the behaviour is not obvious:

```ts
// Keep the draft version so a concurrent edit can be detected on save.
```

### Preserve engineering reasoning

A comment that records an architectural decision stays, even when it needs rewriting. The website
builder storing one structured document rather than a column per section type is a real decision with
a real reason; keep the reason and cut the narration.

### Security comments get extra care

Never shorten a comment so far that an invariant is lost. This applies to tenant isolation, RLS
policies, authorization, encryption, children's check-in, authorized pickup, financial records,
payment processing, audit logging, data retention, concurrency, and input sanitization.

### Keep history that prevents a regression

A comment explaining a bug that was fixed is valuable when it stops the bug coming back. Keep the
fact and the failure mode, cut the story of finding it, and keep the requirement or story ID
(`R22.2`, `HRT-377`) for traceability.

### JSDoc on exported things

Exported functions, types and package entry points get JSDoc when a caller needs something that is
not in the signature: the purpose, an unclear parameter, non-obvious return behaviour, a constraint,
a side effect, an error condition, or a security requirement. A self-explanatory type needs none.
Documentation that tooling depends on stays as it is.

### TODO, FIXME and the rest

A marker comment names the condition that would resolve it, and references a story where one exists:

```ts
// TODO(HRT-368): remove once service_times has a writer in the product.
```

An unresolved marker stays. A marker whose work is demonstrably done is deleted along with the
problem.

### Density

A simple function does not need paragraphs. Watch for the same decision explained in three files, a
module header that says nothing a reader could not see, and a requirement ID repeated with no new
context. There is no comment-to-code ratio to hit; the test is whether a reader learns something.

## Commits

- Conventional prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Reference the PRD requirement ID where one applies: `feat(checkin): offline code ranges (R8.21)`.
- Reference the work item in the footer, on its own line: `Work item: HRT-21`.
- One logical change per commit.
- Update the board in the same commit as the work.
- **No assistant attribution, co-author trailers, or generated-by lines.**

## Where to look

| File | Contents |
|---|---|
| [../CLAUDE.md](../CLAUDE.md) | Operating instructions and product constraints |
| [../PRD.md](../PRD.md) | Full specification, numbered requirements, acceptance criteria |
| [../BACKLOG.md](../BACKLOG.md) | The board |
| [architecture.md](architecture.md) | Tenancy, offline check-in, the job queue, the sync contract |
| [data-model.md](data-model.md) | Entities and their relationships |
| [design-system.md](design-system.md) | Tokens, colour, type, motion, components, station rules |
| [ux-writing.md](ux-writing.md) | Product language |
| [environments.md](environments.md) | Production, development, and which credentials live where |
| [performance.md](performance.md) | What is measured, and the numbers |
| [backup-and-restore.md](backup-and-restore.md) | The restore runbook and the drill log |
| [repository-inventory.md](repository-inventory.md) | What every questionable file is for |
