/**
 * R1.1. The human looking at a new church.
 *
 * Run by whoever operates the platform. There is no screen for it inside a
 * church, because a church cannot approve itself, and no queue with a task on
 * somebody, because a queue was built and taken out on the same day for putting
 * work on a volunteer.
 *
 *   pnpm --filter @connectapp/db approve                    list what is waiting
 *   pnpm --filter @connectapp/db approve <slug> <your name> say it is a church
 *   pnpm --filter @connectapp/db approve --revoke <slug>    say it is not
 */
import { owner, closeConnections } from "../src/client";
import { withAuditTriggersOff } from "../src/maintenance";

interface Waiting {
  slug: string;
  name: string;
  created_at: Date;
  members: number;
  who: string | null;
}

async function waiting(): Promise<void> {
  const rows = await owner()<Waiting[]>`
    select t.slug,
           t.name,
           t.created_at,
           (select count(*)::int from members p where p.tenant_id = t.id) as members,
           (select u.email
              from tenant_members m
              join app_users u on u.id = m.user_id
             where m.tenant_id = t.id
             order by m.created_at
             limit 1) as who
      from tenants t
     where t.approved_at is null
       and t.demo_expires_at is null
     order by t.created_at`;

  if (rows.length === 0) {
    console.log("Nothing waiting.");
    return;
  }

  console.log(`${rows.length} waiting:\n`);
  for (const row of rows) {
    const age = Math.round((Date.now() - row.created_at.getTime()) / 60000);
    console.log(`  ${row.slug}`);
    console.log(`    ${row.name}`);
    console.log(`    ${row.who ?? "no account yet"}, ${row.members} members, ${age} minutes old\n`);
  }
  console.log("pnpm --filter @connectapp/db approve <slug> <your name>");
}

async function approve(slug: string, by: string): Promise<void> {
  const rows = await withAuditTriggersOff((sql) => sql<{ name: string }[]>`
    update tenants
       set approved_at = now(), approved_by = ${by}
     where slug = ${slug} and approved_at is null
    returning name`);

  console.log(rows[0] ? `${rows[0].name} is approved.` : `Nothing waiting called ${slug}.`);
}

async function revoke(slug: string): Promise<void> {
  const rows = await withAuditTriggersOff((sql) => sql<{ name: string }[]>`
    update tenants
       set approved_at = null, approved_by = null, join_code = null
     where slug = ${slug}
    returning name`);

  console.log(rows[0] ? `${rows[0].name} is provisional again.` : `No church called ${slug}.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "--revoke" && args[1]) await revoke(args[1]);
  else if (args.length === 0) await waiting();
  else if (args[0] && args.length >= 2) await approve(args[0], args.slice(1).join(" "));
  else console.log("pnpm --filter @connectapp/db approve <slug> <your name>");

  await closeConnections();
}

void main();
