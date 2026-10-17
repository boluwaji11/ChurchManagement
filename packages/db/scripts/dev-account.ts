/**
 * HRT-402, R21.x. The sandbox's own account.
 *
 * The two environments hold separate Supabase projects, so an address that
 * signs in to production does not exist in development at all. What it does
 * do is read as though it might, and a password typed into the wrong one of
 * two identical doors is a mistake worth designing out rather than
 * remembering not to make.
 *
 * So the sandbox gets an address of its own: dev@connectapp.church, which
 * exists nowhere else, opens dev.connectapp.church and
 * dev-admin.connectapp.church, and has no counterpart in production to be
 * confused with.
 *
 *   pnpm --filter @connectapp/db dev:account
 *
 * It refuses to run against production, which is the reason it exists.
 */
import { randomBytes } from "node:crypto";
import { owner, closeConnections } from "../src/client";
import { whereWeAre } from "@connectapp/env";

const EMAIL = "dev@connectapp.church";
const NAME = "ConnectApp Dev";
const ID = "11111111-2222-4333-8444-777777777777";

async function main(): Promise<void> {
  const here = whereWeAre();
  if (here.environment === "production" || here.productionData) {
    throw new Error("This account belongs to the sandbox. Refusing to write it to production.");
  }

  const given = process.argv[2];
  const password = given || randomBytes(18).toString("base64url");
  const sql = owner();

  await sql`
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      is_super_admin, is_sso_user
    ) values (
      ${ID}::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
      ${EMAIL}, crypt(${password}, gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', ${NAME}::text),
      '', '', '', '', '', '', '', '',
      false, false
    )
    on conflict (id) do update
      set encrypted_password = excluded.encrypted_password, updated_at = now()`;

  await sql`
    insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                                 last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), ${ID}::uuid, ${ID},
      jsonb_build_object('sub', ${ID}::text, 'email', ${EMAIL}::text, 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict do nothing`;

  await sql`
    insert into app_users (id, email, full_name)
    values (${ID}::uuid, ${EMAIL}, ${NAME})
    on conflict (id) do update set email = excluded.email, full_name = excluded.full_name`;

  await sql`
    insert into platform_admins (user_id, name)
    values (${ID}::uuid, ${NAME})
    on conflict (user_id) do update
      set name = excluded.name, granted_at = now(), revoked_at = null`;

  console.log(`${EMAIL} is on the sandbox team.`);
  console.log(`It opens dev.connectapp.church and dev-admin.connectapp.church.`);
  if (!given) console.log(`\nPassword: ${password}\n`);
  await closeConnections();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await closeConnections();
  process.exit(1);
});
