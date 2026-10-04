/**
 * Gives every account a record in the church it belongs to.
 *
 * Everybody who signs in is somebody the church holds a record for. Accounts
 * made before that was true, or seeded for local review, are linked here: to a
 * record already carrying their address where there is one, and to a new record
 * where there is not.
 */
import { owner, closeConnections } from "../src/client";
import { linkOrCreatePerson } from "../src/repo/membership";

async function main() {
  const sql = owner();

  const rows = await sql<
    { tenant_id: string; slug: string; user_id: string; email: string; full_name: string | null }[]
  >`
    select m.tenant_id, t.slug, m.user_id, u.email, u.full_name
      from tenant_members m
      join app_users u on u.id = m.user_id
      join tenants t on t.id = m.tenant_id
     where not exists (
       select 1 from people p
        where p.tenant_id = m.tenant_id and p.app_user_id = m.user_id and p.archived_at is null
     )
     order by t.slug, u.email`;

  for (const row of rows) {
    const id = await linkOrCreatePerson({
      tenantId: row.tenant_id,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
    });
    if (!id) {
      console.log(`  ${row.slug.padEnd(12)} ${row.email.padEnd(32)} left alone, that address is already claimed`);
      continue;
    }
    const [person] = await sql<{ name: string }[]>`
      select btrim(coalesce(preferred_name, first_name) || ' ' || coalesce(last_name, '')) as name
        from people where id = ${id}`;
    console.log(`  ${row.slug.padEnd(12)} ${row.email.padEnd(32)} ${person!.name}`);
  }

  console.log(`\n${rows.length} accounts linked.`);
  await closeConnections();
}

void main();
