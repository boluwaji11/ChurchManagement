/**
 * R21.x. The first operator, and the way back in if the last one is lost.
 *
 * The portal grants and revokes its own operators, which is where it belongs
 * once there is one. Before that there is nobody to press the button, so the
 * first grant is made here, from a machine that already holds the production
 * database URL. That is the right level of privilege for the decision: whoever
 * can run this can already read every table.
 *
 *   pnpm --filter @connectapp/db platform:admin list
 *   pnpm --filter @connectapp/db platform:admin grant you@example.org "Your Name"
 *   pnpm --filter @connectapp/db platform:admin revoke you@example.org
 *
 * The account has to exist first: sign up in the product with that address, then
 * run the grant. Every change lands in platform_events, named "bootstrap", so
 * the log shows it was made from a terminal rather than from the portal.
 */
import { owner, closeConnections } from "../src/client";

type Row = { id: string; email: string };

async function accountFor(email: string): Promise<Row> {
  const rows = await owner()<Row[]>`
    select id, email from app_users where lower(email) = ${email} limit 1`;
  const found = rows[0];
  if (!found) {
    throw new Error(
      `No account signs in with ${email} yet. Sign up in the product with that address first.`,
    );
  }
  return found;
}

async function record(action: string, note: string): Promise<void> {
  await owner()`
    insert into platform_events (actor_name, action, note)
    values ('bootstrap', ${action}, ${note})`;
}

async function main(): Promise<void> {
  const [command, email, ...rest] = process.argv.slice(2);
  const address = (email ?? "").trim().toLowerCase();
  const name = rest.join(" ").trim();

  if (command === "list") {
    const rows = await owner()<
      { name: string; email: string; granted_at: Date; revoked_at: Date | null }[]
    >`
      select a.name, u.email, a.granted_at, a.revoked_at
        from platform_admins a
        join app_users u on u.id = a.user_id
       order by a.granted_at asc`;

    if (rows.length === 0) {
      console.log("No operators yet. Grant the first one:");
      console.log('  pnpm --filter @connectapp/db platform:admin grant you@example.org "Your Name"');
    }
    for (const row of rows) {
      const standing = row.revoked_at ? "revoked" : "live";
      console.log(`${standing.padEnd(8)} ${row.email.padEnd(32)} ${row.name}`);
    }
    return;
  }

  if (command === "grant") {
    if (!address || !name) {
      throw new Error('Usage: platform:admin grant <email> "<name>"');
    }
    const account = await accountFor(address);
    await owner()`
      insert into platform_admins (user_id, name)
      values (${account.id}, ${name})
      on conflict (user_id) do update
        set name = excluded.name, granted_at = now(), revoked_at = null`;
    await record("granted", `${name} (${address})`);
    console.log(`${address} now operates the platform.`);
    return;
  }

  if (command === "revoke") {
    if (!address) throw new Error("Usage: platform:admin revoke <email>");
    const account = await accountFor(address);
    const rows = await owner()<{ name: string }[]>`
      update platform_admins set revoked_at = now()
       where user_id = ${account.id} and revoked_at is null
       returning name`;
    if (!rows[0]) throw new Error(`${address} does not operate the platform.`);
    await record("revoked", `${rows[0].name} (${address})`);
    console.log(`${address} no longer operates the platform.`);
    return;
  }

  console.log("Usage:");
  console.log("  platform:admin list");
  console.log('  platform:admin grant <email> "<name>"');
  console.log("  platform:admin revoke <email>");
}

main()
  .then(() => closeConnections())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await closeConnections();
    process.exit(1);
  });
