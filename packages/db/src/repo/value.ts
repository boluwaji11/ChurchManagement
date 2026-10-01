import type postgres from "postgres";

/**
 * R22.3. Time to value, measured rather than hoped for.
 *
 * The target is under sixty minutes from signing up to a directory somebody can
 * use. A target nobody measures is a sentence in a document, so this reads it
 * off the church's own records: when the tenant was made, and the moment it
 * first held a directory worth opening.
 *
 * "Worth opening" is a committed import, or twenty-five people entered by hand,
 * whichever came first. Twenty-five because a church of fifty to five hundred
 * with twenty-five people in it has stopped evaluating and started using it,
 * and one person typed in while looking around has not.
 *
 * Derived, so it stays true when an import is rolled back and redone, and so
 * nothing has to be written at the moment it happens by code that might not run.
 */

export const USABLE_PEOPLE = 25;

export interface TimeToValue {
  tenantId: string;
  slug: string;
  name: string;
  signedUpAt: Date;
  /** Null while the church has not got there yet. */
  usableAt: Date | null;
  /** How it got there: an import, or people entered one at a time. */
  how: "import" | "by_hand" | null;
  minutes: number | null;
  people: number;
}

/**
 * Every church and how long it took.
 *
 * Takes the owner connection rather than a tenant one, because it crosses
 * tenants by design: it is a question about the platform rather than about a
 * church, and it never runs in a request path.
 */
export async function timeToValue(sql: postgres.Sql): Promise<TimeToValue[]> {
  const rows = await sql<Record<string, string | null>[]>`
    with first_import as (
      select tenant_id, min(committed_at) as at
        from import_batches
       where committed_at is not null and rolled_back_at is null
       group by tenant_id
    ),
    nth_person as (
      select tenant_id, min(created_at) as at from (
        select tenant_id, created_at,
               row_number() over (partition by tenant_id order by created_at) as n
          from people
      ) ranked
      where n = ${USABLE_PEOPLE}
      group by tenant_id
    )
    select t.id, t.slug, t.name, t.created_at,
           i.at as import_at,
           p.at as hand_at,
           (select count(*) from people where tenant_id = t.id) as people
      from tenants t
      left join first_import i on i.tenant_id = t.id
      left join nth_person p on p.tenant_id = t.id
     where t.demo_expires_at is null
     order by t.created_at
  `;

  return rows.map((row) => {
    const signedUpAt = new Date(String(row["created_at"]));
    const importAt = row["import_at"] ? new Date(String(row["import_at"])) : null;
    const handAt = row["hand_at"] ? new Date(String(row["hand_at"])) : null;

    const usableAt =
      importAt && handAt ? (importAt < handAt ? importAt : handAt) : (importAt ?? handAt);
    const how = usableAt === null ? null : usableAt === importAt ? "import" : "by_hand";

    return {
      tenantId: String(row["id"]),
      slug: String(row["slug"]),
      name: String(row["name"]),
      signedUpAt,
      usableAt,
      how,
      minutes:
        usableAt === null
          ? null
          : Math.round((usableAt.getTime() - signedUpAt.getTime()) / 60_000),
      people: Number(row["people"] ?? 0),
    };
  });
}

/** R22.3. The number the target is about: the middle church, not the average. */
export function medianMinutes(rows: TimeToValue[]): number | null {
  const got = rows
    .map((row) => row.minutes)
    .filter((minutes): minutes is number => minutes !== null)
    .sort((a, b) => a - b);
  if (got.length === 0) return null;
  const middle = Math.floor(got.length / 2);
  return got.length % 2 === 0 ? Math.round((got[middle - 1]! + got[middle]!) / 2) : got[middle]!;
}

/** R22.3. The share of churches that made it inside the hour. */
export function withinTarget(rows: TimeToValue[], minutes = 60): number | null {
  const got = rows.filter((row) => row.minutes !== null);
  if (got.length === 0) return null;
  return got.filter((row) => row.minutes! <= minutes).length / got.length;
}
