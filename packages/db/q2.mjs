import { readFileSync } from "node:fs";
import postgres from "postgres";
const env = Object.fromEntries(
  readFileSync("/Users/boluwaji.oyewumi/Church Management/.env.local", "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const sql = postgres(env.DATABASE_URL, { prepare: false });
const rows = await sql`select token, address, state, member_id from contact_consent where channel='email' order by updated_at desc limit 5`;
console.log(rows);
await sql.end();
