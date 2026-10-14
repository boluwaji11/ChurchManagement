import { owner, closeConnections } from "../src/client";

/**
 * Renames one member, for a development database only.
 *
 * The marketing screenshots are taken from the seeded church, and a real
 * person's name should not be in a picture on a public page. Everything else
 * on the record, the addresses above all, is untouched, so whoever was testing
 * with it carries on testing with it.
 *
 *   pnpm --filter @connectapp/db exec tsx scripts/rename-member.ts "Old Name" "New Name"
 */
async function main() {
  const [was, now] = process.argv.slice(2);
  if (!was || !now) {
    console.error('Give the name to change and the name to use: "Old Name" "New Name"');
    process.exit(1);
  }

  const [first = "", ...rest] = now.split(" ");
  const last = rest.join(" ");

  const sql = owner();
  const rows = await sql<{ id: string }[]>`
    update members
       set first_name = ${first},
           last_name = ${last},
           preferred_name = null
     where btrim(coalesce(preferred_name, first_name) || ' ' || last_name) = ${was}
    returning id`;

  console.log(`Renamed ${rows.length} member(s) from ${was} to ${now}`);
  await closeConnections();
}

void main();
