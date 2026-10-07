/**
 * One-off: forget a church's connected account so Connect starts fresh.
 *
 * The account itself still exists in Stripe; this only drops what we stored,
 * so the next press of Connect Stripe creates a new one with everything the
 * church has told us since.
 */
import { owner, closeConnections } from "../src/client";

const slug = process.argv[2];
if (!slug) throw new Error("Usage: tsx scripts/forget-stripe.ts <church-slug>");

const sql = owner();
const gone = await sql<{ account_id: string }[]>`
  delete from stripe_accounts
   where tenant_id = (select id from tenants where slug = ${slug})
  returning account_id`;

console.log(gone.length === 0 ? `Nothing stored for ${slug}.` : `Forgot ${gone[0]!.account_id}.`);
await closeConnections();
