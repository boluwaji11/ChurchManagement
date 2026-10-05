/**
 * Puts the address on somebody's record in step with the one they sign in with.
 *
 * The two drifted apart before the profile screen tied them together: an
 * account linked to a record that carried a different address meant the person
 * looking at their own profile saw an email they had never signed in with.
 */
import { owner, closeConnections } from "../src/client";

async function main() {
  const sql = owner();

  const rows = await sql<
    { member_id: string; tenant_id: string; name: string; account: string; record: string | null }[]
  >`
    select p.id as member_id, p.tenant_id,
           btrim(coalesce(p.preferred_name, p.first_name) || ' ' || coalesce(p.last_name, '')) as name,
           u.email as account,
           (select value from contact_methods c
             where c.member_id = p.id and c.kind = 'email'
             order by c.is_primary desc limit 1) as record
      from members p
      join app_users u on u.id = p.app_user_id
     where p.archived_at is null
     order by u.email`;

  let changed = 0;
  for (const row of rows) {
    if (row.record && row.record.toLowerCase() === row.account.toLowerCase()) continue;

    const [primary] = await sql<{ id: string }[]>`
      select id from contact_methods
       where member_id = ${row.member_id} and kind = 'email' and is_primary limit 1`;

    if (primary) {
      await sql`update contact_methods set value = ${row.account} where id = ${primary.id}`;
    } else {
      await sql`
        insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
        values (${row.tenant_id}, ${row.member_id}, 'email', 'home', ${row.account}, true)`;
    }

    console.log(`  ${row.name.padEnd(22)} ${row.record ?? "none"} -> ${row.account}`);
    changed += 1;
  }

  console.log(`\n${changed} records brought in step.`);
  await closeConnections();
}

void main();
