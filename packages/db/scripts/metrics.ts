/**
 * R22.3. Time to value, printed.
 *
 * The success metric that decides whether onboarding works: under sixty minutes
 * from signing up to a directory somebody can use. Run it against the real
 * database and it answers for every church at once.
 */
import { owner, closeConnections } from "../src/client";
import { timeToValue, medianMinutes, withinTarget, USABLE_PEOPLE } from "../src/repo/value";

const hm = (minutes: number) =>
  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

async function main() {
  const rows = await timeToValue(owner());

  console.log(`\nTime to value. A church is usable at a committed import or ${USABLE_PEOPLE} people.\n`);
  for (const row of rows) {
    const when = row.minutes === null ? "not yet" : `${hm(row.minutes)} (${row.how})`;
    console.log(`  ${row.slug.padEnd(22)} ${when.padEnd(22)} ${row.people} people`);
  }

  const median = medianMinutes(rows);
  const share = withinTarget(rows);
  console.log(
    `\n  median ${median === null ? "n/a" : hm(median)}` +
      `   within the hour ${share === null ? "n/a" : `${Math.round(share * 100)}%`}` +
      `   churches ${rows.length}\n`,
  );

  await closeConnections();
}

main().catch(async (error) => {
  console.error(error);
  await closeConnections();
  process.exit(1);
});
