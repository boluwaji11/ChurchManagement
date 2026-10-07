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
  /** R13.6. The church's own site, where a giver came from and goes back to. */
  website: string | null;
  /** R1.7. Whether somebody can make an account from the church's own address. */
  selfSignup: boolean;
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
    website: string | null;
    selfSignup: boolean;
    brandHue: string;
    logoKey: string | null;
    accountId: string;
  }[]>`
    select t.id as "tenantId", t.slug, t.name, t.website,
           t.self_signup as "selfSignup",
           t.brand_hue::text as "brandHue",
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
    website: church.website,
    selfSignup: church.selfSignup,
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

/**
 * R13.6, R17.4. Whether this church already holds a record for that address.
 *
 * Asked after a gift, about the address the giver just gave Stripe, so the
 * thank-you page can offer them an account rather than guessing. It answers
 * about one address at a time and tells the caller nothing else, and the
 * caller may only ask about an address it was handed by Stripe.
 */
export async function giverKnown(slug: string, email: string): Promise<boolean> {
  if (!SLUG.test(slug) || !email.includes("@")) return false;

  const rows = await owner()<{ one: number }[]>`
    select 1 as one
      from members m
      join tenants t on t.id = m.tenant_id
      join contact_methods c on c.member_id = m.id
     where t.slug = ${slug}
       and c.kind = 'email'
       and lower(c.value) = ${email.trim().toLowerCase()}
       and m.archived_at is null
     limit 1`;
  return rows.length > 0;
}

/**
 * R13.2. The Stripe customer this church keeps for a member, if any.
 *
 * Read with no session, because the giving page has none, and keyed on the
 * member's own id rather than anything the browser sent.
 */
export async function giverCustomer(memberId: string): Promise<string | null> {
  const rows = await owner()<{ id: string | null }[]>`
    select stripe_customer_id as id from members where id = ${memberId} limit 1`;
  return rows[0]?.id ?? null;
}

/** R13.2. Writing down the customer Stripe just made for them. */
export async function rememberCustomer(memberId: string, customerId: string): Promise<void> {
  await owner()`
    update members set stripe_customer_id = ${customerId}, updated_at = now()
     where id = ${memberId} and stripe_customer_id is null`;
}

/** R13.2. Which member an address belongs to, where exactly one does. */
export async function giverMember(slug: string, email: string): Promise<string | null> {
  if (!SLUG.test(slug) || !email.includes("@")) return null;

  const rows = await owner()<{ id: string }[]>`
    select m.id
      from members m
      join tenants t on t.id = m.tenant_id
      join contact_methods c on c.member_id = m.id
     where t.slug = ${slug}
       and c.kind = 'email'
       and lower(c.value) = ${email.trim().toLowerCase()}
       and m.archived_at is null
     limit 2`;
  return rows.length === 1 ? rows[0]!.id : null;
}
