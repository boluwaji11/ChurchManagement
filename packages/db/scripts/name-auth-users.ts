/**
 * Puts the name in each auth user's metadata in step with their record.
 *
 * The session reads the name from the auth user, not from app_users, so an
 * account seeded as "Admin Riverside" kept showing that in the sidebar however
 * many times the record was corrected. Local development only: in production
 * this follows whatever somebody saved on their own profile.
 */
import { owner, closeConnections } from "../src/client";

async function main() {
  const sql = owner();

  const rows = await sql<{ id: string; email: string; was: string | null; now: string }[]>`
    select u.id, u.email,
           (au.raw_user_meta_data ->> 'full_name') as was,
           btrim(coalesce(p.preferred_name, p.first_name) || ' ' || coalesce(p.last_name, '')) as now
      from app_users u
      join auth.users au on au.id = u.id
      join people p on p.app_user_id = u.id and p.archived_at is null`;

  let changed = 0;
  for (const row of rows) {
    if (!row.now.trim() || row.was === row.now) continue;
    await sql`
      update auth.users
         set raw_user_meta_data = jsonb_set(
               coalesce(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(${row.now}::text)
             )
       where id = ${row.id}`;
    await sql`update app_users set full_name = ${row.now} where id = ${row.id}`;
    console.log(`  ${row.email.padEnd(32)} ${(row.was ?? "none").padEnd(22)} -> ${row.now}`);
    changed += 1;
  }

  console.log(`\n${changed} accounts renamed.`);
  await closeConnections();
}

void main();
