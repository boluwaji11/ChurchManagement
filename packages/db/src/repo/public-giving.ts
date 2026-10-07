import { owner } from "../client";

/**
 * R13.6. What a stranger standing on the church's giving page may read.
 *
 * No session, so this is one of the few reads that cannot go through RLS. It
 * is deliberately narrow: the church's name and colour, and the funds it is
 * willing to receive a gift to. Nothing about anybody.
 */

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

export interface GivingPage {
  slug: string;
  name: string;
  brandHue: string;
  logoKey: string | null;
  /** The church's own Stripe account, which is where the money goes. */
  accountId: string;
  funds: { id: string; name: string; description: string | null }[];
}

/**
 * R13.6. The giving page for one church, or nothing.
 *
 * Nothing is returned unless the church has been approved and its own Stripe
 * account is able to take a payment, because a giving page that cannot take a
 * gift is a page that takes somebody's card details and loses them.
 */
export async function givingPage(slug: string): Promise<GivingPage | null> {
  if (!SLUG.test(slug)) return null;

  const rows = await owner()<{
    tenantId: string;
    slug: string;
    name: string;
    brandHue: string;
    logoKey: string | null;
    accountId: string;
  }[]>`
    select t.id as "tenantId", t.slug, t.name, t.brand_hue::text as "brandHue",
           t.logo_key as "logoKey", s.account_id as "accountId"
      from tenants t
      join stripe_accounts s on s.tenant_id = t.id
     where t.slug = ${slug}
       and t.approved_at is not null
       and t.demo_expires_at is null
       and s.charges_enabled
     limit 1`;

  const church = rows[0];
  if (!church) return null;

  const funds = await owner()<{ id: string; name: string; description: string | null }[]>`
    select id, name, description
      from funds
     where tenant_id = ${church.tenantId} and archived_at is null
     order by position asc, name asc`;

  return {
    slug: church.slug,
    name: church.name,
    brandHue: church.brandHue,
    logoKey: church.logoKey,
    accountId: church.accountId,
    funds,
  };
}

/** R13.6. Whether a fund is one this church is receiving gifts to. */
export async function givingFund(slug: string, fundId: string): Promise<boolean> {
  const page = await givingPage(slug);
  return Boolean(page?.funds.some((one) => one.id === fundId));
}
