/**
 * Local review only. Fills one account's bell so the panel can be looked at.
 *
 * One row per kind, so every icon and every hue in NOTIFICATION_LOOK appears,
 * spread over a few days with the oldest two already read.
 */
import { owner, closeConnections } from "../src/client";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LINES = [
  { kind: "join_request", key: "bell.joinRequest", params: { name: "Aaron Adler", group: "Tuesday Men" }, href: "/groups", ago: 12 * MINUTE, read: false },
  { kind: "serving_declined", key: "bell.servingDeclined", params: { name: "Joy Mbeki", team: "Worship", date: "Oct 12" }, href: "/serving", ago: HOUR, read: false },
  { kind: "form_response", key: "bell.formResponse", params: { form: "Baptism class" }, href: "/forms", ago: 5 * HOUR, read: false },
  { kind: "incident", key: "bell.incident", params: { room: "Nursery" }, href: "/checkin", ago: DAY, read: false },
  { kind: "followup_assigned", key: "bell.followupAssigned", params: { name: "Bella Castro" }, href: "/followups", ago: 2 * DAY, read: false },
  { kind: "duplicate", key: "bell.duplicate", params: { count: 3 }, href: "/duplicates", ago: 4 * DAY, read: true },
  { kind: "serving_accepted", key: "bell.servingAccepted", params: { name: "Tyler Carter", team: "Greeters", date: "Oct 19" }, href: "/serving", ago: 6 * DAY, read: true },
];

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Pass the account's email address.");

  const sql = owner();
  const [account] = await sql<{ user_id: string; tenant_id: string }[]>`
    select m.user_id, m.tenant_id
      from tenant_members m
      join app_users u on u.id = m.user_id
     where u.email = ${email}
     limit 1`;
  if (!account) throw new Error(`No account for ${email}`);

  await sql`delete from notifications where user_id = ${account.user_id}`;

  for (const line of LINES) {
    const at = new Date(Date.now() - line.ago);
    await sql`
      insert into notifications (tenant_id, user_id, kind, message_key, params, href, read_at, created_at)
      values (${account.tenant_id}, ${account.user_id}, ${line.kind}, ${line.key},
              ${sql.json(line.params)}, ${line.href}, ${line.read ? at : null}, ${at})`;
  }

  console.log(`${LINES.length} notifications for ${email}`);
  await closeConnections();
}

void main();
