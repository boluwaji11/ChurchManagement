# Backup and restore

R21.6. Daily backups with point-in-time recovery, and a restore drill run and written down every
quarter. **An untested backup is not a backup**, which is the whole reason this file exists: the
drill is the deliverable, not the backup setting.

## What is protected

| Thing | Where it lives | How it comes back |
|---|---|---|
| Every church's records | Postgres, on Supabase | Point-in-time recovery, below |
| Logos, photos, plan attachments | The `church` storage bucket | Supabase storage backup, same project |
| The code | Git, public | Clone it |
| Secrets | The deployment environment, never in Git | Re-entered by hand. There are few, and they are listed in `.env.example`. |

## Point-in-time recovery

PITR is a **paid Supabase add-on**. The free plan keeps daily backups with a seven-day retention and
no ability to land between them.

This is the one place where running a free platform costs money that cannot be avoided, and it is
worth it: the failure PITR protects against is somebody deleting a congregation's records at 11am and
nobody noticing until 4pm. A daily backup loses that whole day for every church on the instance. The
alternative to paying is telling a church its Tuesday never happened.

**Decision: PITR stays on.** It is listed as an infrastructure cost in the donation coverage ratio
rather than treated as optional.

## The drill, every quarter

Run it against a **restored copy**, never against production. Restoring in place to prove a restore
works is how a drill becomes an outage.

### 1. Take the census

Pick a real church with a reasonable amount of data. Count what it holds right now.

```
pnpm --filter @hearth/db census <slug> --out drills/<yyyy-mm-dd>-before.json
```

The census counts every row of every table carrying a `tenant_id`, found by looking for the column
rather than from a list, so a table added last month is in this quarter's drill without anybody
remembering it. It also digests the row ids, which catches a restore that came back with the right
number of the wrong rows.

Note the time. That is the point you are going to restore to.

**Nothing else may be writing while the census runs.** The test suite mutates the seeded development
churches, so do not run a drill and the test suite at once, and do not drill against a church
somebody is using.

### 2. Restore to a new project

In the Supabase dashboard, Database → Backups → Point in Time, pick the moment the census was taken,
and restore **into a new project**. Supabase restores a full instance; there is no per-tenant
restore, which is why step 4 exists.

### 3. Point the census at the restored copy

```
APP_DATABASE_URL=<the restored project> \
DATABASE_URL=<the restored project> \
  pnpm --filter @hearth/db census <slug> --against drills/<yyyy-mm-dd>-before.json
```

It exits 0 when every table matches and 1 when anything does not, naming the table and whether the
count or the rows themselves differ.

### 4. Pull the church out, if that is what was needed

A real recovery is usually one church rather than the instance. Point a local web app at the
restored project, sign in to that church, and take the full export from Settings. Then import it
into production.

That is the same ungated one-click export a church can take for itself (R19.8), used deliberately:
the thing a church is promised is the thing we rely on in an emergency, so it cannot rot without
somebody noticing.

### 5. Write it down

Add a row to the log below and commit it. A drill nobody recorded did not happen.

### 6. Delete the restored project

It holds a full copy of every church's records. Leaving it up turns a drill into a second attack
surface.

## Drill log

| Date | Church drilled | Rows | Restored to | Result | Who |
|---|---|---|---|---|---|
| | | | | | |

The first row is filled in at the first drill. An empty table is the honest state until then.

## What is not covered yet

- **Restoring one church in place**, without a whole new project. The export and import path (R19.x)
  does it by hand. Automating it waits until a real incident shows what the hand path gets wrong.
- **A second region.** Supabase holds the backup in the same region as the instance. A region-wide
  loss is a longer outage than a restore, and saying so is more honest than implying otherwise.
