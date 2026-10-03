/**
 * A church for one test file, created and taken away by slug.
 *
 * A run that is interrupted between the first test and the teardown leaves its
 * church behind, and the next run then fails on the unique slug before a single
 * test has executed. Clearing the slug on the way in as well as on the way out
 * makes the file recoverable without anybody reaching for psql.
 */
import { owner } from "../../src/client";
import { withAuditTriggersOff } from "../../src/maintenance";

/** Removes the churches these slugs name, with everything that hangs off them. */
export async function dropTenants(...slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  await withAuditTriggersOff(async (sql) => {
    await sql`delete from tenants where slug in ${sql(slugs)}`;
  });
}

/**
 * R1.1. Approved, unless a test is about not being.
 *
 * A church created by the product is provisional and capped at a few people,
 * which is the point of HRT-115. A test church is one somebody has already
 * looked at, because almost every suite is about something else and would
 * otherwise be writing a test of the cap by accident.
 */
export async function testTenant(
  slug: string,
  name: string,
  options: { approved?: boolean } = {},
): Promise<string> {
  await dropTenants(slug);
  const approved = options.approved !== false;
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone, approved_at, approved_by)
    values (
      ${slug}, ${name}, 'America/Chicago',
      ${approved ? new Date() : null}, ${approved ? "test harness" : null}
    )
    returning id`;
  return row!.id;
}
