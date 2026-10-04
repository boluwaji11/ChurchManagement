import { owner } from "../src/client";

/**
 * Removes archived households that nobody is in.
 *
 * The fold left one shell per duplicate, which is correct for a real archive
 * and noise in seeded data. Only rows with no memberships at all go, so a
 * household somebody was archived out of is never touched.
 */
async function main() {
  const sql = owner();

  const gone = await sql<{ id: string }[]>`
    delete from households h
     where h.archived_at is not null
       and not exists (select 1 from household_memberships hm where hm.household_id = h.id)
    returning h.id`;

  console.log(`Removed ${gone.length} empty archived households`);
  await sql.end();
}

void main();
