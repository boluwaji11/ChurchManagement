import { owner } from "../src/client";

/**
 * Removes an email template by name, for one written in a broken build.
 *
 *   pnpm --filter @connectapp/db exec tsx scripts/drop-template.ts "<name>"
 */
async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Name the template to remove.");
    process.exit(1);
  }

  const sql = owner();
  const gone = await sql<{ id: string }[]>`
    delete from email_templates where name = ${name} returning id`;
  console.log(`Removed ${gone.length} template(s) called ${name}`);
  await sql.end();
}

void main();
