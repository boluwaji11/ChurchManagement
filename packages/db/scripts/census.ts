/**
 * R21.6. A census of one church, for proving a restore worked.
 *
 * An untested backup is not a backup, and the way a restore is tested is by
 * counting what came back and comparing it with what went in. So this counts
 * every row of every table belonging to one church, and digests the row ids,
 * which catches a restore that came back with the right number of the wrong
 * rows.
 *
 * Tables are found by looking for a tenant_id, the way the audit and campus
 * triggers are, so a table added next quarter is in the next drill without
 * anybody remembering to add it.
 *
 *   pnpm --filter @hearth/db census <slug>
 *   pnpm --filter @hearth/db census <slug> --out before.json
 *   pnpm --filter @hearth/db census <slug> --against before.json
 */
import { writeFileSync, readFileSync } from "node:fs";
import { owner, closeConnections } from "../src/client";

interface TableCensus {
  rows: number;
  /** An md5 of the row ids in order. Same count, different rows, different digest. */
  digest: string;
}

interface Census {
  slug: string;
  tenantId: string;
  takenAt: string;
  totalRows: number;
  tables: Record<string, TableCensus>;
}

async function tenantTables(): Promise<string[]> {
  const rows = await owner()<{ relname: string }[]>`
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0
     where n.nspname = 'public' and c.relkind = 'r'
     order by c.relname`;
  return rows.map((row) => row.relname);
}

/** Whether the table has an id column to digest. A join table may not. */
async function hasId(table: string): Promise<boolean> {
  const rows = await owner()<{ n: number }[]>`
    select count(*)::int as n
      from information_schema.columns
     where table_schema = 'public' and table_name = ${table} and column_name = 'id'`;
  return (rows[0]?.n ?? 0) > 0;
}

async function take(slug: string): Promise<Census> {
  const sql = owner();

  const [church] = await sql<{ id: string }[]>`select id from tenants where slug = ${slug}`;
  if (!church) throw new Error(`No church with the slug ${slug}.`);

  const tables: Record<string, TableCensus> = {};
  let totalRows = 0;

  for (const table of await tenantTables()) {
    const column = (await hasId(table)) ? "id" : "tenant_id";
    /*
     * The table name cannot be a parameter, so it is interpolated. It comes
     * from pg_class rather than from anybody's input, which is the only reason
     * that is safe here.
     */
    const [row] = await sql.unsafe<{ rows: number; digest: string | null }[]>(
      `select count(*)::int as rows,
              md5(coalesce(string_agg(${column}::text, ',' order by ${column}::text), '')) as digest
         from public."${table}"
        where tenant_id = $1`,
      [church.id],
    );
    tables[table] = { rows: row?.rows ?? 0, digest: row?.digest ?? "" };
    totalRows += row?.rows ?? 0;
  }

  return {
    slug,
    tenantId: church.id,
    takenAt: new Date().toISOString(),
    totalRows,
    tables,
  };
}

function compare(before: Census, after: Census): number {
  const names = [...new Set([...Object.keys(before.tables), ...Object.keys(after.tables)])].sort();
  let wrong = 0;

  console.log(`Taken   ${before.takenAt}`);
  console.log(`Against ${after.takenAt}\n`);

  for (const name of names) {
    const was = before.tables[name];
    const now = after.tables[name];

    if (!was) { console.log(`  + ${name} is new since the census`); wrong += 1; continue; }
    if (!now) { console.log(`  - ${name} is gone`); wrong += 1; continue; }

    if (was.rows !== now.rows) {
      console.log(`  ! ${name}: ${was.rows} rows became ${now.rows}`);
      wrong += 1;
    } else if (was.digest !== now.digest) {
      console.log(`  ! ${name}: ${was.rows} rows, but they are not the same rows`);
      wrong += 1;
    }
  }

  if (wrong === 0) {
    console.log(`  Every table matches. ${before.totalRows} rows across ${names.length} tables.`);
  }
  return wrong;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const slug = args[0];

  if (!slug || slug.startsWith("--")) {
    console.log("pnpm --filter @hearth/db census <slug> [--out <file>] [--against <file>]");
    await closeConnections();
    return;
  }

  const census = await take(slug);

  const against = args.indexOf("--against");
  if (against !== -1 && args[against + 1]) {
    const before = JSON.parse(readFileSync(args[against + 1]!, "utf8")) as Census;
    const wrong = compare(before, census);
    await closeConnections();
    process.exitCode = wrong === 0 ? 0 : 1;
    return;
  }

  const out = args.indexOf("--out");
  if (out !== -1 && args[out + 1]) {
    writeFileSync(args[out + 1]!, `${JSON.stringify(census, null, 2)}\n`);
    console.log(`Written to ${args[out + 1]}`);
  }

  const counted = Object.entries(census.tables).filter(([, t]) => t.rows > 0);
  console.log(`${census.slug}: ${census.totalRows} rows across ${counted.length} tables\n`);
  for (const [name, table] of counted.sort((a, b) => b[1].rows - a[1].rows)) {
    console.log(`  ${String(table.rows).padStart(6)}  ${name}`);
  }

  await closeConnections();
}

void main();
