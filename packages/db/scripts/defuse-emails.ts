import { owner } from "../src/client";

/**
 * Turns every seeded address into one that cannot reach a person.
 *
 * Seeded members carried real-looking gmail.com addresses, and the sending
 * work made that dangerous rather than untidy: a test send on a development
 * database reaches whoever actually owns those inboxes, and `Everyone` on a
 * seeded church is two hundred of them.
 *
 * `example.org` and `example.com` are reserved for exactly this by RFC 2606,
 * so nothing addressed there can leave. The church's own domain is left alone,
 * because those are the addresses somebody is deliberately testing with.
 *
 *   pnpm --filter @connectapp/db exec tsx scripts/defuse-emails.ts
 */
async function main() {
  const sql = owner();

  const before = await sql<{ domain: string; n: number }[]>`
    select split_part(value, '@', 2) as domain, count(*)::int as n
      from contact_methods where kind = 'email'
     group by 1 order by n desc`;

  console.log("Before:");
  for (const row of before) console.log(`  ${row.n}\t${row.domain}`);

  const changed = await sql<{ id: string }[]>`
    update contact_methods
       set value = split_part(value, '@', 1) || '@example.org'
     where kind = 'email'
       and value not like '%example.org'
       and value not like '%example.com'
       and value not like '%@connectapp.church'
    returning id`;

  console.log(`\nRewrote ${changed.length} addresses to example.org`);
  await sql.end();
}

void main();
