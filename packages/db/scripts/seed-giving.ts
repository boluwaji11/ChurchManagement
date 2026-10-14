import { owner, closeConnections } from "../src/client";

/**
 * Gives the seeded church a year of giving.
 *
 * LOCAL DEVELOPMENT ONLY. The giving screens are built and the seed had no
 * gifts in it, so every one of them read "nothing recorded yet": a screen
 * nobody can judge, and a picture nobody should publish.
 *
 * The amounts are invented and the givers are the church's own seeded members,
 * so nothing here is anybody's real money.
 *
 *   pnpm --filter @connectapp/db exec tsx scripts/seed-giving.ts
 */

/** What a church of this size sees in a week, in whole dollars. */
const TYPICAL = [20, 25, 40, 50, 50, 75, 100, 100, 150, 200, 250, 500];
const METHODS = ["card", "card", "card", "ach", "cash", "cheque"] as const;

async function main() {
  const sql = owner();

  const [tenant] = await sql<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  if (!tenant) throw new Error("Riverside is not seeded.");

  const funds = await sql<{ id: string; name: string }[]>`
    select id, name from funds where tenant_id = ${tenant.id} and archived_at is null`;
  if (funds.length === 0) throw new Error("That church keeps no funds.");

  const givers = await sql<{ id: string }[]>`
    select id from members
     where tenant_id = ${tenant.id} and archived_at is null
     order by random() limit 60`;

  const [held] = await sql<{ n: number }[]>`
    select count(*)::int as n from gifts where tenant_id = ${tenant.id}`;
  if ((held?.n ?? 0) > 0) {
    console.log(`That church already has ${held!.n} gifts. Nothing to do.`);
    await closeConnections();
    return;
  }

  /* Fifty-two weeks back, a handful of gifts a week, weighted to the general
     fund the way a church's giving actually is. */
  let written = 0;
  for (let week = 0; week < 52; week += 1) {
    const day = new Date();
    day.setDate(day.getDate() - week * 7 - ((day.getDay() + 7) % 7));
    const on = day.toISOString().slice(0, 10);

    for (let i = 0; i < 6 + (week % 4); i += 1) {
      const giver = givers[(week * 7 + i) % givers.length]!;
      const fund = funds[(week + i) % funds.length]!;
      const dollars = TYPICAL[(week * 3 + i * 5) % TYPICAL.length]!;
      const method = METHODS[(week + i) % METHODS.length]!;

      await sql`
        insert into gifts (tenant_id, member_id, fund_id, amount_cents, method, received_on)
        values (${tenant.id}, ${giver.id}, ${fund.id}, ${dollars * 100}, ${method}, ${on})`;
      written += 1;
    }
  }

  console.log(`Wrote ${written} gifts across ${funds.length} funds`);
  await closeConnections();
}

void main();
