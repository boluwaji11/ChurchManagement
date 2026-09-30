/**
 * Seeds two churches. Two, not one, because the point of the isolation test
 * suite is proving that one cannot see the other, and a single-tenant seed
 * cannot demonstrate that.
 */
import { owner, closeConnections } from "../src/client";
import { encryptNote } from "../src/crypto";

type Hue = "rose" | "amber" | "citron" | "fern" | "teal" | "sky" | "indigo" | "violet";

const CHURCHES = [
  {
    slug: "riverside",
    name: "Riverside Fellowship",
    legalName: "Riverside Fellowship Inc.",
    timezone: "America/Chicago",
    rooms: [
      { name: "Under fives", hue: "teal" as Hue, min: 6, max: 59, capacity: 24, ratio: 4 },
      { name: "Primary", hue: "violet" as Hue, min: 60, max: 131, capacity: 30, ratio: 8 },
      { name: "Youth", hue: "fern" as Hue, min: 132, max: 215, capacity: 40, ratio: 10 },
    ],
    households: [
      { name: "Bennett", members: [
        ["Sarah", "Bennett", "head", "1986-04-12", "member"],
        ["Michael", "Bennett", "spouse", "1984-11-03", "member"],
        ["Emma", "Bennett", "child", "2022-08-19", "member"],
        ["Noah", "Bennett", "child", "2018-02-27", "member"],
      ]},
      { name: "Ramirez", members: [
        ["Daniel", "Ramirez", "head", "1991-07-22", "regular_attender"],
        ["Alyssa", "Ramirez", "spouse", "1992-01-15", "regular_attender"],
      ]},
      { name: "Whitfield", members: [
        ["Ruth", "Whitfield", "head", "1968-09-30", "member"],
      ]},
      { name: "Carter", members: [
        ["Tyler", "Carter", "head", "1999-03-08", "visitor"],
      ]},
      { name: "Nguyen", members: [
        ["Grace", "Nguyen", "head", "1975-12-01", "member"],
        ["Caleb", "Nguyen", "child", "2011-06-14", "member"],
      ]},
    ],
    tags: [["Choir", "amber"], ["Greeter", "sky"], ["New in 2026", "rose"]] as [string, Hue][],
  },
  {
    slug: "northgate",
    name: "Northgate Community Church",
    legalName: "Northgate Community Church",
    timezone: "America/Denver",
    rooms: [
      { name: "Nursery", hue: "rose" as Hue, min: 0, max: 35, capacity: 12, ratio: 3 },
      { name: "Kids", hue: "citron" as Hue, min: 36, max: 131, capacity: 35, ratio: 8 },
    ],
    households: [
      { name: "Halvorsen", members: [
        ["Ingrid", "Halvorsen", "head", "1980-05-05", "member"],
        ["Erik", "Halvorsen", "spouse", "1979-10-21", "member"],
      ]},
      { name: "Duarte", members: [
        ["Mateo", "Duarte", "head", "1995-02-11", "regular_attender"],
      ]},
    ],
    tags: [["Hospitality", "teal"]] as [string, Hue][],
  },
];

async function main() {
  const sql = owner();

  await sql.unsafe("set client_min_messages = warning");
  console.log("Clearing existing seed data");

  /**
   * The audit trigger has to be off while the reset runs.
   *
   * Deleting a tenant cascades to its people, the trigger records each of those
   * deletions, and the new audit row points at the tenant that is being deleted
   * in the same statement. Postgres refuses it, correctly. Turning the triggers
   * off is honest about what a reset is: it is not a user action, so there is
   * nobody to attribute it to. Only the owner connection can do this, only this
   * script uses the owner connection, and they go straight back on.
   */
  const audited = (
    await sql<{ relname: string }[]>`
      select c.relname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and t.tgname like 'audit_%'`
  ).map((r) => r.relname);

  const setTriggers = async (state: "disable" | "enable") => {
    for (const table of audited) {
      await sql.unsafe(`alter table public.${table} ${state} trigger audit_${table}`);
    }
  };

  await setTriggers("disable");
  try {
    await sql`delete from tenants where slug in ('riverside', 'northgate')`;
  } finally {
    await setTriggers("enable");
  }
  await sql`delete from app_users where email like ${"%@riverside.example.org"} or email like ${"%@northgate.example.org"}`;

  for (const church of CHURCHES) {
    const [tenant] = await sql<{ id: string }[]>`
      insert into tenants (slug, name, legal_name, timezone)
      values (${church.slug}, ${church.name}, ${church.legalName}, ${church.timezone})
      returning id`;
    if (!tenant) throw new Error("tenant insert failed");
    const tid = tenant.id;

    // Staff accounts, so the app_users isolation test has something to try to
    // enumerate across tenants.
    for (const [name, email, role] of [
      ["Pastor " + church.name.split(" ")[0], `pastor@${church.slug}.example.org`, "owner"],
      ["Admin " + church.name.split(" ")[0], `admin@${church.slug}.example.org`, "admin"],
      ["Care " + church.name.split(" ")[0], `care@${church.slug}.example.org`, "pastoral"],
    ] as const) {
      const [user] = await sql<{ id: string }[]>`
        insert into app_users (id, email, full_name)
        values (gen_random_uuid(), ${email}, ${name})
        on conflict (email) do update set full_name = excluded.full_name
        returning id`;
      await sql`
        insert into tenant_members (tenant_id, user_id, role)
        values (${tid}, ${user!.id}, ${role}::tenant_role)
        on conflict do nothing`;
    }

    const [campus] = await sql<{ id: string }[]>`
      insert into campuses (tenant_id, name, is_primary) values (${tid}, ${"Main"}, true) returning id`;
    const [location] = await sql<{ id: string }[]>`
      insert into locations (tenant_id, campus_id, name) values (${tid}, ${campus!.id}, ${"Main building"}) returning id`;

    for (const r of church.rooms) {
      await sql`
        insert into rooms (tenant_id, location_id, name, hue, min_age_months, max_age_months, capacity, volunteer_ratio)
        values (${tid}, ${location!.id}, ${r.name}, ${r.hue}, ${r.min}, ${r.max}, ${r.capacity}, ${r.ratio})`;
    }

    const tagIds: string[] = [];
    for (const [name, hue] of church.tags) {
      const [tag] = await sql<{ id: string }[]>`
        insert into tags (tenant_id, name, hue) values (${tid}, ${name}, ${hue}) returning id`;
      tagIds.push(tag!.id);
    }

    let personCount = 0;
    const firstPersonByHousehold: Record<string, string> = {};

    for (const h of church.households) {
      const [household] = await sql<{ id: string }[]>`
        insert into households (tenant_id, campus_id, name) values (${tid}, ${campus!.id}, ${h.name}) returning id`;

      for (const [first, last, role, dob, status] of h.members) {
        const [person] = await sql<{ id: string }[]>`
          insert into people (tenant_id, campus_id, first_name, last_name, date_of_birth, lifecycle_status)
          values (${tid}, ${campus!.id}, ${first!}, ${last!}, ${dob!}, ${status!}::lifecycle_status)
          returning id`;
        const pid = person!.id;
        personCount++;
        firstPersonByHousehold[h.name] ??= pid;

        await sql`
          insert into household_memberships (tenant_id, household_id, person_id, role, started_on)
          values (${tid}, ${household!.id}, ${pid}, ${role!}::household_role, ${"2023-03-01"})`;

        if (role !== "child") {
          await sql`
            insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
            values (${tid}, ${pid}, 'email', 'home', ${`${first!.toLowerCase()}.${last!.toLowerCase()}@example.org`}, true)`;
          await sql`
            insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
            values (${tid}, ${pid}, 'phone', 'mobile', ${`(512) 555 ${String(1000 + personCount).slice(1)}`}, true)`;
        }

        if (tagIds.length && personCount % 2 === 0) {
          await sql`
            insert into person_tags (tenant_id, person_id, tag_id)
            values (${tid}, ${pid}, ${tagIds[personCount % tagIds.length]!})`;
        }
      }

      await sql`
        insert into addresses (tenant_id, household_id, line1, city, region, postal_code)
        values (${tid}, ${household!.id}, ${`${100 + personCount} Elm Street`}, ${"Austin"}, ${"TX"}, ${"78701"})`;
    }

    // A confidential note, so the permission tests have something real to fail on.
    const subject = firstPersonByHousehold[church.households[0]!.name]!;
    await sql`
      insert into notes (tenant_id, person_id, classification, body)
      values (${tid}, ${subject}, 'general', ${"Brought a friend on Sunday. Happy to host a group."})`;
    await sql`
      insert into notes (tenant_id, person_id, classification, body_encrypted)
      values (${tid}, ${subject}, 'confidential', ${encryptNote(
        `Confidential pastoral note for ${church.name}. If this string is ever readable by a staff role, the permission boundary is broken.`,
      )})`;

    console.log(`  ${church.name}: ${church.households.length} households, ${personCount} people, ${church.rooms.length} rooms`);
  }

  const totals = await sql<{ count: string }[]>`select count(*)::text as count from people`;
  console.log(`\nSeeded 2 churches, ${totals[0]?.count ?? "0"} people total.`);
  await closeConnections();
}

main().catch(async (err) => {
  console.error(err);
  await closeConnections();
  process.exit(1);
});
