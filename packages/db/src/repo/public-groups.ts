import { owner } from "../client";

/**
 * R9.5. A church's groups, for somebody who has never been.
 *
 * A church links its groups page from its own website, and whoever follows that
 * link has no account and should not need one to find out that there is a
 * Tuesday group for parents of young children. The finder behind sign-in
 * answers the member's question. This answers the stranger's.
 *
 * Runs on the owner connection because there is no session to set a tenant
 * from, which means every query here carries its own tenant predicate and the
 * columns are listed by hand. Nothing is selected that a church has not already
 * chosen to publish:
 *
 *   - Only groups marked listed, on a church somebody has already looked at.
 *   - No leader names. R9.3 names them inside the church because "who runs it"
 *     is the question behind the others; publishing a volunteer's name on the
 *     open web is a different act and not one a church asked for.
 *   - No roster, and no addresses beyond the one the church typed into the
 *     field that exists for publishing.
 */

export interface PublicChurch {
  slug: string;
  name: string;
  brandHue: string;
  phone: string | null;
  website: string | null;
  /** R1.1. The church's own mark, where it has uploaded one. */
  logoKey: string | null;
}

export interface PublicGroup {
  id: string;
  name: string;
  description: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  frequency: string | null;
  location: string | null;
  address: string | null;
  /** R9.5. Whether the address is one a map can find, so a link is worth drawing. */
  mappable: boolean;
  forWhom: string | null;
  online: boolean;
  childrenWelcome: boolean;
  /** How many are in it, which is a size rather than a list of people. */
  memberCount: number;
  full: boolean;
  openToJoin: boolean;
  photoKey: string | null;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

/**
 * R9.5, R1.1. The church a public link names.
 *
 * Null for a church nobody has looked at yet, and for a demo. A provisional
 * church has no public door at all, which is the same rule as the join link.
 */
export async function publicChurch(slug: string): Promise<PublicChurch | null> {
  if (!SLUG.test(slug)) return null;

  const rows = await owner()<PublicChurch[]>`
    select slug, name, brand_hue::text as "brandHue", phone, website,
           logo_key as "logoKey"
      from tenants
     where slug = ${slug}
       and approved_at is not null
       and demo_expires_at is null
     limit 1`;
  return rows[0] ?? null;
}

/** R9.5. The groups this church has chosen to publish. */
export async function publicGroups(slug: string): Promise<PublicGroup[]> {
  const church = await publicChurch(slug);
  if (!church) return [];

  return owner()<PublicGroup[]>`
    select g.id,
           g.name,
           g.description,
           gt.name as "typeName",
           gt.hue::text as "typeHue",
           g.day_of_week as "dayOfWeek",
           g.starts_at as "startsAt",
           g.ends_at as "endsAt",
           g.frequency,
           g.location,
           nullif(concat_ws(', ', g.address_line1, g.city, g.region, g.postal_code), '') as address,
           (g.address_line1 is not null and g.address_line1 <> ''
             and coalesce(nullif(g.city, ''), nullif(g.postal_code, ''), nullif(g.region, '')) is not null) as mappable,
           g.for_whom as "forWhom",
           g.online,
           g.children_welcome as "childrenWelcome",
           coalesce(m.n, 0)::int as "memberCount",
           (g.capacity is not null and coalesce(m.n, 0) >= g.capacity) as full,
           g.open_to_join as "openToJoin",
           g.photo_key as "photoKey"
      from groups g
      join tenants t on t.id = g.tenant_id
      left join group_types gt on gt.id = g.type_id
      left join (
        select group_id, count(*) as n
          from group_memberships
         where left_on is null
         group by group_id
      ) m on m.group_id = g.id
     where t.slug = ${slug}
       and g.listed
       and g.archived_at is null
     order by gt.name nulls last, g.name`;
}

/** R9.5. One published group, for a link straight to it. */
export async function publicGroup(slug: string, id: string): Promise<PublicGroup | null> {
  const all = await publicGroups(slug);
  return all.find((group) => group.id === id) ?? null;
}

/**
 * R14.2. The timezone a public page should read dates in.
 *
 * The church's own, so "closes on the 6th" means the whole of the 6th where the
 * church is, rather than where the server or the reader happens to be.
 */
export async function publicChurchTimezone(slug: string): Promise<string> {
  if (!SLUG.test(slug)) return "America/Chicago";
  const rows = await owner()<{ timezone: string }[]>`
    select timezone from tenants where slug = ${slug} limit 1`;
  return rows[0]?.timezone ?? "America/Chicago";
}
