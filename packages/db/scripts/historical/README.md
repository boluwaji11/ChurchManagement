# Historical repair scripts

One-off scripts that fixed a specific problem in a specific database, kept because they record what
went wrong and how it was put right. **None of them is part of the normal workflow**, and the
problems they fixed no longer occur.

Run one only if you have the same problem, and read it first: each targets development data and
several assume shapes the current seed no longer produces.

```
pnpm --filter @connectapp/db exec tsx scripts/historical/<name>.ts
```

| Script | What it repaired | Why it is finished |
|---|---|---|
| `fold-households.ts` | Folded one-household-per-person into one per surname, per church | The seed writes households correctly now |
| `drop-empty-households.ts` | Removed the archived household shells that the fold left behind | The cleanup pass after the script above |
| `name-auth-users.ts` | Copied a member's name into their Supabase auth metadata | The sidebar read the auth user's name while the record said something else. The profile screen keeps the two in step now |
| `rename-member.ts` | Renamed one seeded member | A real person's name was in a seeded church used for marketing screenshots. The screenshots have been taken |

The live operational tools stay in `packages/db/scripts/`, including `forget-stripe.ts`,
`drop-template.ts`, `sync-account-emails.ts`, `link-accounts.ts` and `defuse-emails.ts`. Those repair
situations a support case can still produce.

See [docs/repository-inventory.md](../../../../docs/repository-inventory.md) for how each script in
this package was classified.
