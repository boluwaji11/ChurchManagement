/**
 * HRT-402, R21.x. Four churches for the sandbox, all of them dev's.
 *
 * `pnpm seed` builds the two churches the isolation suite argues over, and
 * those belong to the tests: their slugs are hard-coded in assertions and
 * their staff accounts exist to be enumerated across a tenant boundary. Using
 * them to look at the product means working in the fixture.
 *
 * So the sandbox gets four of its own, owned by dev@connectapp.church, in four
 * timezones, with enough in them that a screen has something to draw: people
 * in households, rooms a child could be checked into, tags, addresses, and a
 * run of services behind and ahead of today.
 *
 *   pnpm --filter @connectapp/db seed:dev
 *
 * It refuses to run against production, and it clears only its own four slugs,
 * so the test churches and anything else in the sandbox are left alone.
 */
import { whereWeAre } from "@connectapp/env";
import { owner, closeConnections } from "../src/client";
import { deleteTenants } from "../src/maintenance";

type Hue = "rose" | "amber" | "citron" | "fern" | "teal" | "sky" | "indigo" | "violet";
type Member = [first: string, last: string, role: string, dob: string, status: string];

const OWNER_EMAIL = "dev@connectapp.church";

interface Church {
  slug: string;
  name: string;
  legalName: string;
  timezone: string;
  city: string;
  region: string;
  postal: string;
  area: string;
  rooms: { name: string; hue: Hue; min: number; max: number; capacity: number; ratio: number }[];
  tags: [string, Hue][];
  services: { name: string; at: string; weekday: number }[];
  households: { name: string; members: Member[] }[];
}

const CHURCHES: Church[] = [
  {
    slug: "stonebridge",
    name: "Stonebridge Chapel",
    legalName: "Stonebridge Chapel Inc.",
    timezone: "America/New_York",
    city: "Ashford", region: "NY", postal: "14011", area: "716",
    rooms: [
      { name: "Nursery", hue: "rose", min: 0, max: 35, capacity: 14, ratio: 3 },
      { name: "Under fives", hue: "teal", min: 36, max: 71, capacity: 24, ratio: 4 },
      { name: "Primary", hue: "violet", min: 72, max: 143, capacity: 32, ratio: 8 },
    ],
    tags: [["Welcome team", "sky"], ["Worship", "amber"], ["New this year", "rose"]],
    services: [
      { name: "Morning service", at: "09:30", weekday: 0 },
      { name: "Evening service", at: "18:00", weekday: 0 },
    ],
    households: [
      { name: "Alderton", members: [
        ["Margaret", "Alderton", "head", "1972-03-18", "member"],
        ["Peter", "Alderton", "spouse", "1970-08-02", "member"],
        ["Hannah", "Alderton", "child", "2013-05-21", "member"],
      ]},
      { name: "Castellano", members: [
        ["Marco", "Castellano", "head", "1988-11-09", "member"],
        ["Elena", "Castellano", "spouse", "1990-02-14", "member"],
        ["Luca", "Castellano", "child", "2021-09-30", "member"],
        ["Sofia", "Castellano", "child", "2019-01-07", "member"],
      ]},
      { name: "Fenwick", members: [
        ["Dorothy", "Fenwick", "head", "1955-06-25", "member"],
      ]},
      { name: "Brennan", members: [
        ["Shaun", "Brennan", "head", "1995-04-11", "regular_attender"],
        ["Niamh", "Brennan", "spouse", "1996-10-19", "regular_attender"],
      ]},
      { name: "Lindqvist", members: [
        ["Annika", "Lindqvist", "head", "1983-07-04", "member"],
        ["Oskar", "Lindqvist", "child", "2016-12-12", "member"],
      ]},
      { name: "Pryce", members: [
        ["Gareth", "Pryce", "head", "2001-02-28", "visitor"],
      ]},
    ],
  },
  {
    slug: "cedarhollow",
    name: "Cedar Hollow Church",
    legalName: "Cedar Hollow Church",
    timezone: "America/Chicago",
    city: "Marbury", region: "IL", postal: "60119", area: "630",
    rooms: [
      { name: "Little ones", hue: "citron", min: 0, max: 47, capacity: 18, ratio: 3 },
      { name: "Kids", hue: "fern", min: 48, max: 143, capacity: 40, ratio: 8 },
      { name: "Youth", hue: "indigo", min: 144, max: 215, capacity: 35, ratio: 10 },
    ],
    tags: [["Hospitality", "fern"], ["Small group leader", "indigo"]],
    services: [{ name: "Gathering", at: "10:00", weekday: 0 }],
    households: [
      { name: "Vandermeer", members: [
        ["Joost", "Vandermeer", "head", "1979-09-17", "member"],
        ["Katrien", "Vandermeer", "spouse", "1981-03-29", "member"],
        ["Pieter", "Vandermeer", "child", "2010-11-05", "member"],
        ["Lotte", "Vandermeer", "child", "2014-06-23", "member"],
      ]},
      { name: "Kowalski", members: [
        ["Agnieszka", "Kowalski", "head", "1965-12-08", "member"],
        ["Tomasz", "Kowalski", "spouse", "1963-05-16", "member"],
      ]},
      { name: "Shepherd", members: [
        ["Imogen", "Shepherd", "head", "1993-08-27", "regular_attender"],
        ["Rosa", "Shepherd", "child", "2023-02-02", "member"],
      ]},
      { name: "Takahashi", members: [
        ["Kenji", "Takahashi", "head", "1986-01-30", "member"],
        ["Mai", "Takahashi", "spouse", "1987-07-13", "member"],
      ]},
      { name: "Fairweather", members: [
        ["Colin", "Fairweather", "head", "1950-10-03", "member"],
      ]},
    ],
  },
  {
    slug: "fairhaven",
    name: "Fairhaven Assembly",
    legalName: "Fairhaven Assembly",
    timezone: "America/Denver",
    city: "Brightmere", region: "CO", postal: "80452", area: "303",
    rooms: [
      { name: "Creche", hue: "rose", min: 0, max: 35, capacity: 10, ratio: 3 },
      { name: "Explorers", hue: "amber", min: 36, max: 131, capacity: 28, ratio: 8 },
    ],
    tags: [["Prayer team", "violet"], ["Musician", "amber"], ["Serving", "teal"]],
    services: [
      { name: "First service", at: "08:30", weekday: 0 },
      { name: "Second service", at: "11:00", weekday: 0 },
      { name: "Midweek", at: "19:00", weekday: 3 },
    ],
    households: [
      { name: "Marchetti", members: [
        ["Giulia", "Marchetti", "head", "1990-06-09", "member"],
        ["Davide", "Marchetti", "spouse", "1989-04-20", "member"],
        ["Matteo", "Marchetti", "child", "2020-03-15", "member"],
      ]},
      { name: "Lindgren", members: [
        ["Beatrice", "Lindgren", "head", "1974-02-11", "member"],
        ["Samuel", "Lindgren", "child", "2009-08-08", "member"],
      ]},
      { name: "Driscoll", members: [
        ["Frances", "Driscoll", "head", "1958-11-22", "member"],
        ["Raymond", "Driscoll", "spouse", "1956-09-14", "member"],
      ]},
      { name: "Halloran", members: [
        ["Keiran", "Halloran", "head", "1998-12-30", "regular_attender"],
      ]},
      { name: "Westbrook", members: [
        ["Juliet", "Westbrook", "head", "1984-05-07", "member"],
        ["Theo", "Westbrook", "child", "2017-10-26", "member"],
        ["Iris", "Westbrook", "child", "2022-04-18", "member"],
      ]},
    ],
  },
  {
    slug: "westmoor",
    name: "Westmoor Parish",
    legalName: "Westmoor Parish",
    timezone: "America/Los_Angeles",
    city: "Hollisgate", region: "CA", postal: "93012", area: "805",
    rooms: [
      { name: "Nursery", hue: "teal", min: 0, max: 35, capacity: 12, ratio: 3 },
      { name: "Juniors", hue: "sky", min: 36, max: 107, capacity: 26, ratio: 6 },
      { name: "Seniors", hue: "violet", min: 108, max: 215, capacity: 30, ratio: 10 },
    ],
    tags: [["Reader", "sky"], ["Bell ringer", "citron"]],
    services: [
      { name: "Said service", at: "08:00", weekday: 0 },
      { name: "Sung service", at: "10:30", weekday: 0 },
    ],
    households: [
      { name: "Ashworth", members: [
        ["Eleanor", "Ashworth", "head", "1961-01-19", "member"],
        ["Howard", "Ashworth", "spouse", "1959-07-28", "member"],
      ]},
      { name: "Nakamura", members: [
        ["Haruto", "Nakamura", "head", "1992-10-05", "member"],
        ["Yuki", "Nakamura", "spouse", "1994-03-12", "member"],
        ["Ren", "Nakamura", "child", "2024-01-09", "member"],
      ]},
      { name: "Delacroix", members: [
        ["Camille", "Delacroix", "head", "1977-08-14", "member"],
        ["Antoine", "Delacroix", "child", "2012-02-06", "member"],
        ["Léa", "Delacroix", "child", "2015-11-29", "member"],
      ]},
      { name: "Quill", members: [
        ["Bernard", "Quill", "head", "1948-04-02", "member"],
      ]},
      { name: "Sandoval", members: [
        ["Marisol", "Sandoval", "head", "1996-09-23", "visitor"],
      ]},
    ],
  },
];

/** The date of the most recent given weekday on or before today. */
function lastWeekday(weekday: number, weeksBack: number): string {
  const day = new Date();
  day.setUTCHours(12, 0, 0, 0);
  const back = (day.getUTCDay() - weekday + 7) % 7;
  day.setUTCDate(day.getUTCDate() - back - weeksBack * 7);
  return day.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const here = whereWeAre();
  if (here.environment === "production" || here.productionData) {
    throw new Error("These churches belong to the sandbox. Refusing to write them to production.");
  }

  const sql = owner();
  await sql.unsafe("set client_min_messages = warning");

  const [account] = await sql<{ id: string }[]>`
    select id from app_users where lower(email) = ${OWNER_EMAIL} limit 1`;
  if (!account) {
    throw new Error(`${OWNER_EMAIL} has no account. Run: pnpm --filter @connectapp/db dev:account`);
  }

  console.log("Clearing the four sandbox churches");
  await deleteTenants(CHURCHES.map((one) => one.slug));

  for (const church of CHURCHES) {
    const [tenant] = await sql<{ id: string }[]>`
      insert into tenants (slug, name, legal_name, timezone, approved_at, approved_by)
      values (${church.slug}, ${church.name}, ${church.legalName}, ${church.timezone},
              now(), 'sandbox seed')
      returning id`;
    const tid = tenant!.id;

    await sql`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tid}, ${account.id}, 'owner'::tenant_role)
      on conflict (tenant_id, user_id) do update set role = excluded.role`;

    const [campus] = await sql<{ id: string }[]>`
      insert into campuses (tenant_id, name, is_primary)
      values (${tid}, 'Main', true) returning id`;
    const [location] = await sql<{ id: string }[]>`
      insert into locations (tenant_id, campus_id, name)
      values (${tid}, ${campus!.id}, 'Main building') returning id`;

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

    let people = 0;
    for (const house of church.households) {
      const [household] = await sql<{ id: string }[]>`
        insert into households (tenant_id, campus_id, name)
        values (${tid}, ${campus!.id}, ${house.name}) returning id`;

      for (const [first, last, role, dob, status] of house.members) {
        const [person] = await sql<{ id: string }[]>`
          insert into members (tenant_id, campus_id, slug, first_name, last_name, date_of_birth, lifecycle_status)
          values (${tid}, ${campus!.id},
                  hearth_free_member_slug(${tid}::uuid, ${`${first} ${last}`}),
                  ${first}, ${last}, ${dob}, ${status}::lifecycle_status)
          returning id`;
        people++;

        await sql`
          insert into household_memberships (tenant_id, household_id, member_id, role, started_on)
          values (${tid}, ${household!.id}, ${person!.id}, ${role}::household_role, '2023-03-01')`;

        if (role !== "child") {
          await sql`
            insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
            values (${tid}, ${person!.id}, 'email', 'home',
                    ${`${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@example.org`}, true)`;
          await sql`
            insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
            values (${tid}, ${person!.id}, 'phone', 'mobile',
                    ${`(${church.area}) 555 ${String(1000 + people).slice(1)}`}, true)`;
        }

        if (tagIds.length && people % 3 !== 0) {
          await sql`
            insert into member_tags (tenant_id, member_id, tag_id)
            values (${tid}, ${person!.id}, ${tagIds[people % tagIds.length]!})
            on conflict do nothing`;
        }
      }

      await sql`
        insert into addresses (tenant_id, household_id, line1, city, region, postal_code)
        values (${tid}, ${household!.id}, ${`${100 + people} Maple Avenue`},
                ${church.city}, ${church.region}, ${church.postal})`;
    }

    /* Six weeks behind and two ahead, so attendance has a history to draw and
       the next service day is never empty. */
    let occurrences = 0;
    for (const service of church.services) {
      for (let week = 5; week >= -2; week--) {
        const on = lastWeekday(service.weekday, week);
        await sql`
          insert into service_occurrences (tenant_id, campus_id, slug, name, occurs_on, starts_at)
          values (${tid}, ${campus!.id},
                  ${`${on}-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`},
                  ${service.name}, ${on}, ${service.at})
          on conflict do nothing`;
        occurrences++;
      }
    }

    console.log(
      `  ${church.name.padEnd(24)} ${String(people).padStart(2)} people, ` +
      `${church.rooms.length} rooms, ${occurrences} services`,
    );
  }

  console.log(`\nFour churches, all owned by ${OWNER_EMAIL}.`);
  await closeConnections();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await closeConnections();
  process.exit(1);
});
