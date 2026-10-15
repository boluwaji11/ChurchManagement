# Pull requests

Every change arrives as a pull request, including the maintainer's own. Nothing is pushed to `main`
or `production` directly.

1. Branch from `main`, named for the story: `hrt-367-onboarding-wizard`.
2. Open the pull request. CI runs types, lint, the catalogue, the design tokens, the contrast audit,
   the string externalisation check, the backlog check and the whole database suite against a real
   Postgres.
3. The owner reviews and merges. A story is only Closed by the person who tested it.
4. `production` is reached by merging `main` into it, and only when the owner asks.

A pull request that CI has failed is not ready to be read. Fix it and push again.
