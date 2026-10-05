/**
 * Gives a few seeded Riverside members real accounts.
 *
 * LOCAL DEVELOPMENT ONLY, like seed-users.ts, and for the same reason: so the
 * screens that assign work to an account have more than three names to assign
 * it to. In production an account is made by signing in with an email link.
 *
 * The members are picked by name, so running this twice changes nothing.
 */
import { owner, closeConnections } from "../src/client";
import { required } from "../src/env";

const INSTANCE = "00000000-0000-0000-0000-000000000000";

/** Who gets an account, and what they may do. */
const STAFF: { name: string; role: string }[] = [
  { name: "Sarah Bennett", role: "pastoral" },
  { name: "Daniel Ramirez", role: "staff" },
  { name: "Ruth Whitfield", role: "pastoral" },
  { name: "Miriam Reyes", role: "staff" },
  { name: "Tyler Carter", role: "group_leader" },
];

async function main() {
  const sql = owner();
  const password = required("SEED_USER_PASSWORD");
  await sql.unsafe("set client_min_messages = warning");
  await sql`create extension if not exists pgcrypto`;

  const [tenant] = await sql<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  if (!tenant) throw new Error("No Riverside church in this database.");

  for (const one of STAFF) {
    const [first, ...rest] = one.name.split(" ");
    const last = rest.join(" ");

    const [person] = await sql<{ id: string; email: string | null }[]>`
      select p.id,
             (select value from contact_methods
               where member_id = p.id and kind = 'email'
               order by is_primary desc limit 1) as email
        from members p
       where p.tenant_id = ${tenant.id}
         and coalesce(p.preferred_name, p.first_name) = ${first!}
         and p.last_name = ${last}
         and p.archived_at is null
       limit 1`;

    if (!person) {
      console.log(`  ${one.name.padEnd(20)} not in this church, skipped`);
      continue;
    }

    const email = (person.email ?? `${first!.toLowerCase()}.${last.toLowerCase()}@riverside.example.org`)
      .toLowerCase();

    const [existing] = await sql<{ id: string }[]>`
      select id from app_users where lower(email) = ${email}`;
    if (existing) {
      console.log(`  ${one.name.padEnd(20)} already has an account`);
      continue;
    }

    // app_users.id is the auth user's id, so it is made here and used for both.
    const [user] = await sql<{ id: string }[]>`
      insert into app_users (id, email, full_name)
      values (gen_random_uuid(), ${email}, ${one.name})
      returning id`;

    await sql`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${user!.id}::uuid, ${one.role}::tenant_role)
      on conflict do nothing`;

    await sql`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token,
        is_sso_user, is_anonymous
      )
      values (
        ${INSTANCE}::uuid, ${user!.id}::uuid, 'authenticated', 'authenticated',
        ${email}, crypt(${password}, gen_salt('bf')),
        now(), now(), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', ${one.name}::text),
        '', '', '', '', '', '', '', '',
        false, false
      )
      on conflict (id) do nothing`;

    await sql`
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      )
      values (
        gen_random_uuid(), ${user!.id}::uuid, ${user!.id},
        jsonb_build_object('sub', ${user!.id}::text, 'email', ${email}::text, 'email_verified', true),
        'email', now(), now(), now()
      )
      on conflict do nothing`;

    console.log(`  ${one.name.padEnd(20)} ${one.role.padEnd(13)} ${email}`);
  }

  console.log("\nPassword is SEED_USER_PASSWORD from .env.local.");
  await closeConnections();
}

main().catch(async (err) => {
  console.error(err);
  await closeConnections();
  process.exit(1);
});
