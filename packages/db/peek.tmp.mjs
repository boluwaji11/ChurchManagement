import postgres from "postgres";
process.loadEnvFile("/Users/boluwaji.oyewumi/Church Management/.env.local");
const sql = postgres(process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL, { ssl: "require", max: 1 });
const rows = await sql`
  select p.id, p.user_id, u.email, left(p.endpoint, 60) as endpoint, p.used_at, p.created_at
    from push_subscriptions p left join app_users u on u.id = p.user_id
   order by p.created_at desc`;
console.log("push rows:", rows.length);
for (const r of rows) console.log(" ", r.email, "|", r.endpoint, "|", r.created_at);
await sql.end();
