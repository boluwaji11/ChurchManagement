/**
 * R18.12. Puts a built report on a church, through the same path the screen
 * uses, so the spec is checked against the catalogue and the address is picked
 * the same way.
 *
 *   pnpm --filter @hearth/db exec tsx scripts/seed-report.ts <slug>
 */
import { owner, withTenant, closeConnections } from "../src/client";
import { createSavedReport } from "../src/repo/saved-reports";
import { runReport } from "../src/repo/report-compiler";
import { DEFAULT_LOOK } from "../src/repo/report-spec";
import type { ReportSpec } from "../src/repo/report-spec";
import type { TenantRole } from "../src/roles";

const churchSlug = process.argv[2] ?? "riverside";

/**
 * Of each kind of member, how many have found a group.
 *
 * A real question for a church rather than a demonstration: the status tells
 * you who they are to you, and the split tells you whether they have anywhere
 * to belong. Stacked, because the comparison that matters is within each bar.
 */
const reports: { name: string; spec: ReportSpec }[] = [
  {
    name: "Members with a group",
    spec: {
      subject: "members",
      filters: [{ field: "status", op: "isNot", value: "deceased" }],
      join: "and",
      columns: ["name", "status", "inGroup", "lastSeenOn"],
      groupBy: "status",
      splitBy: "inGroup",
      topN: null,
      totals: true,
      values: [],
      sort: null,
      view: "stacked",
      look: DEFAULT_LOOK,
    },
  },
  {
    /**
     * The list a church works through. Anybody who has been recorded present
     * at some point and not for a while, oldest first, so the top of the list
     * is the person it has been longest since anybody saw.
     */
    name: "Not seen in a while",
    spec: {
      subject: "members",
      filters: [
        { field: "lastSeenOn", op: "notEmpty", value: "" },
        { field: "status", op: "isNot", value: "deceased" },
      ],
      join: "and",
      columns: ["name", "status", "lastSeenOn", "visits", "inGroup"],
      groupBy: null,
      splitBy: null,
      topN: null,
      totals: false,
      values: [],
      sort: { field: "lastSeenOn", dir: "asc" },
      view: "table",
      look: DEFAULT_LOOK,
    },
  },
  {
    /** How many different people each service actually draws. */
    name: "People at each service",
    spec: {
      subject: "attendance",
      filters: [],
      join: "and",
      columns: ["name", "service", "date"],
      groupBy: "service",
      splitBy: null,
      topN: null,
      totals: true,
      values: [{ agg: "distinct" }],
      sort: null,
      view: "bar",
      look: DEFAULT_LOOK,
    },
  },
];

async function main(): Promise<void> {
  const db = owner();
  const [church] = await db`select id, name from tenants where slug = ${churchSlug} limit 1`;
  if (!church) throw new Error(`No church called ${churchSlug}`);

  const [member] = await db`
    select user_id, role from tenant_members
     where tenant_id = ${church["id"]} and role in ('owner', 'admin')
     order by role limit 1`;

  const actor = {
    tenantId: String(church["id"]),
    role: (member?.["role"] ?? "owner") as TenantRole,
    userId: member?.["user_id"] ? String(member["user_id"]) : undefined,
  };

  for (const one of reports) {
    const [already] = await db`
      select slug from saved_reports where tenant_id = ${church["id"]} and name = ${one.name} limit 1`;
    if (already) {
      console.log(`Already there: "${one.name}" at /reports/custom/${already["slug"]}`);
      continue;
    }

    const made = await withTenant(actor, (tx) =>
      createSavedReport(tx, actor, { name: one.name, spec: one.spec }),
    );

    // Run it the way the screen will, so this says what the church will see.
    const result = await withTenant(actor, (tx) => runReport(tx, made.spec));

    console.log(`Saved "${made.name}" at /reports/custom/${made.slug}`);
    console.log(`  ${result.rows.length} rows${result.total === null ? "" : `, total ${result.total}`}`);
    for (const series of result.grid?.series ?? []) {
      console.log(`    ${series.name || "(blank)"}: ${series.values.join(", ")}`);
    }
    if (result.grid) console.log(`    across ${result.grid.labels.join(", ")}`);
    if (result.chart) {
      for (const point of result.chart) console.log(`    ${point.label}: ${point.value}`);
    }
  }

  await closeConnections();
}

main().catch(async (error) => {
  console.error(error);
  await closeConnections();
  process.exit(1);
});
