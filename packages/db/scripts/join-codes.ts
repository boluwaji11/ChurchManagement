/**
 * Prints each real church's join code, giving it one if it has none.
 *
 * A development convenience. A church gets its code from the team screen.
 */
import { owner, closeConnections } from "../src/client";
import { rotateJoinCode, formatJoinCode } from "../src/repo/joining";

async function main() {
  const rows = await owner()<{ id: string; slug: string; name: string }[]>`
    select id, slug, name from tenants where demo_expires_at is null order by created_at`;
  for (const row of rows) {
    const code = await rotateJoinCode(row.id, "owner");
    console.log(`${row.name} (${row.slug})  ${formatJoinCode(code)}  /join/${code}`);
  }
  await closeConnections();
}

void main();
