import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
console.table(await sql`
  select f.title, f.due_on, f.done_at, f.created_at, f.outcome, p.name as pipeline
    from follow_ups f
    left join pipeline_entries e on e.id = f.entry_id
    left join pipelines p on p.id = e.pipeline_id
   where f.done_at is not null
   order by f.done_at desc limit 10`);
await sql.end();
