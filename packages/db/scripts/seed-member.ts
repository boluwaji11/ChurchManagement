/**
 * Gives the seeded member account something to look at.
 *
 * LOCAL DEVELOPMENT ONLY. The member role was seeded as a person with no
 * household, no group and no serving, so every screen in the portal rendered
 * its empty state and there was nothing to test. This puts a family, a group,
 * a team and a few upcoming services on them.
 *
 * Safe to run again. Everything is checked before it is written, so a second
 * run reports what is already there and adds nothing.
 *
 *   pnpm --filter @connectapp/db exec tsx scripts/seed-member.ts [slug]
 */
import { owner, closeConnections } from "../src/client";

const churchSlug = process.argv[2] ?? "riverside";
const account = `member@${churchSlug}.example.org`;

/** Today, and the Sundays after it, as plain dates. */
const today = new Date().toISOString().slice(0, 10);

async function main() {
  const sql = owner();
  await sql.unsafe("set client_min_messages = warning");

  const [tenant] = await sql<{ id: string }[]>`
    select id from tenants where slug = ${churchSlug}`;
  if (!tenant) throw new Error(`No church with the address ${churchSlug}.`);
  const tid = tenant.id;

  const [me] = await sql<{ id: string; firstName: string; lastName: string; campusId: string | null }[]>`
    select p.id, p.first_name as "firstName", p.last_name as "lastName", p.campus_id as "campusId"
      from members p
      join app_users u on u.id = p.app_user_id
     where p.tenant_id = ${tid} and lower(u.email) = ${account}`;
  if (!me) throw new Error(`No member record behind ${account}.`);
  console.log(`Seeding ${me.firstName} ${me.lastName} on ${churchSlug}\n`);

  // ---- Who they live with ------------------------------------------------
  const [household] = await sql<{ id: string }[]>`
    select h.id
      from households h
      join household_memberships m on m.household_id = h.id
     where m.member_id = ${me.id} and m.ended_on is null
     limit 1`;

  let householdId = household?.id ?? null;

  if (householdId) {
    console.log("  household      already there");
  } else {
    const [made] = await sql<{ id: string }[]>`
      insert into households (tenant_id, campus_id, name)
      values (${tid}, ${me.campusId}, ${`The ${me.lastName} household`})
      returning id`;
    householdId = made!.id;

    await sql`
      insert into household_memberships (tenant_id, household_id, member_id, role, started_on)
      values (${tid}, ${householdId}, ${me.id}, 'head', '2023-03-01')`;

    // A spouse and a child, so the household screen has more than one row and
    // the children setting has something it governs.
    const family: [string, string, string, string | null][] = [
      ["Sam", me.lastName, "spouse", "1989-04-12"],
      ["Mia", me.lastName, "child", "2017-10-22"],
    ];
    for (const [first, last, role, dob] of family) {
      const [person] = await sql<{ id: string }[]>`
        insert into members (tenant_id, campus_id, slug, first_name, last_name, date_of_birth, lifecycle_status)
        values (
          ${tid}, ${me.campusId},
          ${sql`hearth_free_member_slug(${tid}, ${`${first} ${last}`})`},
          ${first}, ${last}, ${dob}, 'member'::lifecycle_status
        )
        returning id`;
      await sql`
        insert into household_memberships (tenant_id, household_id, member_id, role, started_on)
        values (${tid}, ${householdId}, ${person!.id}, ${role}::household_role, '2023-03-01')`;
    }
    console.log("  household      made, with a spouse and a child");
  }

  // ---- What the privacy screen has to show --------------------------------
  const counted = await sql<{ n: string }[]>`
    select count(*) as n from contact_methods where member_id = ${me.id}`;
  if (Number(counted[0]?.n ?? 0) > 0) {
    console.log("  contacts       already there");
  } else {
    await sql`
      insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
      values (${tid}, ${me.id}, 'email', 'home', ${account}, true),
             (${tid}, ${me.id}, 'phone', 'mobile', '(512) 555 0147', true)`;
    console.log("  contacts       an email and a phone");
  }

  const addressed = await sql<{ n: string }[]>`
    select count(*) as n from addresses
     where household_id = ${householdId} or member_id = ${me.id}`;
  if (Number(addressed[0]?.n ?? 0) > 0) {
    console.log("  address        already there");
  } else {
    await sql`
      insert into addresses (tenant_id, household_id, label, line1, city, region, postal_code, is_primary)
      values (${tid}, ${householdId}, 'home', '418 Pecan Grove Dr', 'Austin', 'TX', '78745', true)`;
    console.log("  address        on the household");
  }

  await sql`
    update members set date_of_birth = coalesce(date_of_birth, '1987-10-22')
     where id = ${me.id}`;

  // ---- A group to belong to ----------------------------------------------
  const [inGroup] = await sql<{ name: string }[]>`
    select g.name from group_memberships m
      join groups g on g.id = m.group_id
     where m.member_id = ${me.id} and m.left_on is null
     limit 1`;
  if (inGroup) {
    console.log(`  group          already in ${inGroup.name}`);
  } else {
    const [group] = await sql<{ id: string; name: string }[]>`
      select id, name from groups
       where tenant_id = ${tid} and archived_at is null
       order by name limit 1`;
    if (!group) {
      console.log("  group          this church has none");
    } else {
      await sql`
        insert into group_memberships (tenant_id, group_id, member_id, role, joined_on)
        values (${tid}, ${group.id}, ${me.id}, 'member', '2024-09-01')`;
      console.log(`  group          joined ${group.name}`);
    }
  }

  // ---- A team, and the next few services ----------------------------------
  const [team] = await sql<{ id: string; name: string }[]>`
    select id, name from teams
     where tenant_id = ${tid} and archived_at is null
     order by position, name limit 1`;

  if (!team) {
    console.log("  serving        this church has no teams");
  } else {
    const [onTeam] = await sql<{ id: string }[]>`
      select id from team_members
       where team_id = ${team.id} and member_id = ${me.id} and left_on is null`;
    if (!onTeam) {
      await sql`
        insert into team_members (tenant_id, team_id, member_id, role, joined_on)
        values (${tid}, ${team.id}, ${me.id}, 'member', '2024-09-01')`;
    }

    const [position] = await sql<{ id: string; name: string }[]>`
      select id, name from team_positions
       where team_id = ${team.id} and archived_at is null
       order by position, name limit 1`;

    const services = await sql<{ id: string; occursOn: string }[]>`
      select id, occurs_on::text as "occursOn" from service_occurrences
       where tenant_id = ${tid} and occurs_on >= ${today} and status = 'scheduled'
       order by occurs_on, starts_at
       limit 3`;

    if (!position || services.length === 0) {
      console.log("  serving        no position or no services ahead");
    } else {
      // The first one is left waiting, because that is the card the portal
      // leads with and the one worth seeing.
      const states = ["pending", "accepted", "accepted"];
      let added = 0;
      for (const [i, service] of services.entries()) {
        const [already] = await sql<{ id: string }[]>`
          select id from serving_assignments
           where occurrence_id = ${service.id}
             and position_id = ${position.id}
             and member_id = ${me.id}`;
        if (already) continue;
        await sql`
          insert into serving_assignments
            (tenant_id, occurrence_id, team_id, position_id, member_id, status, responded_at)
          values (
            ${tid}, ${service.id}, ${team.id}, ${position.id}, ${me.id},
            ${states[i] ?? "pending"},
            ${states[i] === "accepted" ? sql`now()` : null}
          )`;
        added++;
      }
      console.log(
        added > 0
          ? `  serving        ${team.name} / ${position.name}, ${added} service(s), the first waiting`
          : "  serving        already scheduled",
      );
    }
  }

  // ---- One stretch away, so the list and the remove both have something ----
  const away = await sql<{ n: string }[]>`
    select count(*) as n from blockout_dates
     where member_id = ${me.id} and ends_on >= ${today}`;
  if (Number(away[0]?.n ?? 0) > 0) {
    console.log("  away           already there");
  } else {
    await sql`
      insert into blockout_dates (tenant_id, member_id, starts_on, ends_on, reason)
      values (
        ${tid}, ${me.id},
        ${today}::date + 24, ${today}::date + 31,
        'Away with family'
      )`;
    console.log("  away           one week next month");
  }

  console.log(`\nSign in as ${account} and open /home.`);
  await closeConnections();
}

main().catch(async (error) => {
  console.error(error);
  await closeConnections();
  process.exit(1);
});
