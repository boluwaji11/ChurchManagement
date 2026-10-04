import { owner } from "../src/client";

/**
 * R2.1. Folds one-per-person households into one per surname, per church.
 *
 * Seeded data made a household for every person, so a family of five read as
 * five households all called the same thing. The oldest of each name is kept
 * and everybody else's membership moves onto it; the emptied ones are archived
 * rather than deleted, like every other record.
 */
async function main() {
  const sql = owner();

  const tenants = await sql<{ id: string; name: string }[]>`select id, name from tenants`;

  for (const tenant of tenants) {
    const families = await sql<{ name: string; ids: string[] }[]>`
      select name, array_agg(id order by created_at) as ids
        from households
       where tenant_id = ${tenant.id} and archived_at is null
       group by name
      having count(*) > 1`;

    let folded = 0;
    for (const family of families) {
      const [keep, ...rest] = family.ids;
      if (!keep || rest.length === 0) continue;

      // Somebody already in the keeper keeps the membership they have there.
      await sql`
        delete from household_memberships
         where household_id = any(${rest}::uuid[])
           and person_id in (select person_id from household_memberships where household_id = ${keep})`;

      await sql`
        update household_memberships
           set household_id = ${keep}
         where household_id = any(${rest}::uuid[])`;

      await sql`
        update households set archived_at = now()
         where id = any(${rest}::uuid[])`;

      folded += rest.length;
    }

    console.log(`${tenant.name}: ${families.length} families, ${folded} duplicates folded in`);
  }

  await sql.end();
}

void main();
