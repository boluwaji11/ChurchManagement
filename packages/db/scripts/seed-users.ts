/**
 * Creates confirmed Supabase Auth users for the seeded churches.
 *
 * LOCAL DEVELOPMENT ONLY. Writing to auth.users directly is not how accounts get
 * made in production: there, members sign in with an email link and invitations
 * are matched to their verified address. This exists so the authorization chain
 * can be tested end to end without an inbox, and so there is something to sign in
 * with while reviewing.
 *
 * The password is read from SEED_USER_PASSWORD and hashed with bcrypt through
 * pgcrypto, which is what GoTrue expects.
 */
import { owner, closeConnections } from "../src/client";
import { required } from "../src/env";

const INSTANCE = "00000000-0000-0000-0000-000000000000";

/**
 * An account that belongs to no church, for testing the way in.
 *
 * Every other seeded account is already an owner or an admin somewhere, so none
 * of them can reach the "start a church" path. The id is fixed rather than
 * random so re-seeding produces the same person rather than a new one each time.
 */
const NEWCOMER = {
  id: "11111111-2222-4333-8444-555555555555",
  email: "founder@newchurch.example.org",
  fullName: "No Church Yet",
};

async function main() {
  const sql = owner();
  const password = required("SEED_USER_PASSWORD");
  await sql.unsafe("set client_min_messages = warning");
  await sql`create extension if not exists pgcrypto`;

  // Delete and recreate rather than upsert. An upsert leaves whatever was there
  // before in the columns it does not touch, and a half-correct auth.users row
  // fails in ways that are very hard to read from the outside.
  await sql`
    delete from auth.users
    where email like ${"%@riverside.example.org"}
       or email like ${"%@northgate.example.org"}
       or email = ${NEWCOMER.email}`;

  const rows = await sql<{ id: string; email: string; full_name: string | null; tenant: string; role: string }[]>`
    select u.id, u.email, u.full_name, t.name as tenant, m.role::text as role
    from app_users u
    join tenant_members m on m.user_id = u.id
    join tenants t on t.id = m.tenant_id
    where u.email like ${"%@riverside.example.org"} or u.email like ${"%@northgate.example.org"}
    order by t.name, m.role`;

  // No app_users row for the newcomer. They get one the first time they sign in,
  // which is exactly what a real new account does.
  const members = [
    ...rows,
    { id: NEWCOMER.id, email: NEWCOMER.email, full_name: NEWCOMER.fullName, tenant: "No church", role: "none" },
  ];

  for (const m of members) {
    const existing = { id: m.id };

    // The token columns must be empty strings, not null. GoTrue scans them into
    // Go strings, and a null there fails the whole query with the unhelpful
    // "Database error querying schema". This is the reason writing to auth.users
    // by hand is a test fixture and not a production path.
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
        ${INSTANCE}::uuid, ${existing.id}::uuid, 'authenticated', 'authenticated',
        ${m.email}, crypt(${password}, gen_salt('bf')),
        now(), now(), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', ${m.full_name}::text),
        '', '', '', '', '', '', '', '',
        false, false
      )
`;

    await sql`
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), ${existing.id}::uuid, ${existing.id},
        -- Built in SQL, not JSON.stringify'd in the client. A client-side string
        -- lands as a jsonb scalar rather than an object, the generated email
        -- column comes out null, and GoTrue fails its scan with the unhelpful
        -- "Database error querying schema".
        jsonb_build_object('sub', ${existing.id}::text, 'email', ${m.email}::text, 'email_verified', true),
        'email', now(), now(), now()
      )
`;

    console.log(`  ${m.email.padEnd(34)} ${m.role.padEnd(9)} ${m.tenant}`);
  }

  console.log(`\n${members.length} accounts ready. Password is SEED_USER_PASSWORD from .env.local.`);
  await closeConnections();
}

main().catch(async (err) => {
  console.error(err);
  await closeConnections();
  process.exit(1);
});
