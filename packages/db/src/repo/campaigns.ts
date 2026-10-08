import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { campaigns, funds, gifts, pledges } from "../schema/giving";
import { members } from "../schema/members";
import { PermissionError, canManageGiving, canReadGivingAmounts } from "../roles";
import { settled } from "./gift-status";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R13.16. Campaigns, and what people have committed to them.
 *
 * A campaign is a target over a period against one fund, which is what makes
 * progress countable: every gift to that fund inside the period counts once
 * and nothing is reconciled by hand.
 *
 * A pledge belongs to the person who made it, and progress against it is read
 * across their household, so a couple who committed once is not chased twice.
 */

export interface Campaign {
  id: string;
  /** R13.16. The name in its address. */
  slug: string;
  name: string;
  description: string | null;
  fundId: string;
  fundName: string;
  targetCents: number;
  startsOn: string;
  endsOn: string | null;
  archived: boolean;
  /** What has come in to the fund inside the period. */
  receivedCents: number;
  /** What people have said they will give. */
  pledgedCents: number;
  pledges: number;
}

export interface Pledge {
  id: string;
  memberId: string;
  name: string;
  amountCents: number;
  /** What their household has given to the campaign's fund in the period. */
  givenCents: number;
  note: string | null;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const day = (value: string | undefined | null, key: string): string => {
  if (!value || !ISO.test(value)) throw new InvalidInputError(key as never);
  return value;
};

/** R13.16. What this church is raising, newest first. */
export async function listCampaigns(
  db: Tx,
  options: { includeArchived?: boolean } = {},
): Promise<Campaign[]> {
  const rows = await db
    .select({
      id: campaigns.id,
      slug: campaigns.slug,
      name: campaigns.name,
      description: campaigns.description,
      fundId: campaigns.fundId,
      fundName: funds.name,
      targetCents: campaigns.targetCents,
      startsOn: sql<string>`${campaigns.startsOn}::text`,
      endsOn: sql<string | null>`${campaigns.endsOn}::text`,
      archivedAt: campaigns.archivedAt,
    })
    .from(campaigns)
    .innerJoin(funds, eq(funds.id, campaigns.fundId))
    .where(options.includeArchived ? undefined : isNull(campaigns.archivedAt))
    .orderBy(desc(campaigns.startsOn));

  const out: Campaign[] = [];
  for (const row of rows) {
    const [received] = await db
      .select({
        cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
      })
      .from(gifts)
      .where(
        and(
          settled,
          eq(gifts.fundId, row.fundId),
          sql`${gifts.receivedOn} >= ${row.startsOn}::date`,
          row.endsOn ? sql`${gifts.receivedOn} <= ${row.endsOn}::date` : sql`true`,
        ),
      );

    const [promised] = await db
      .select({
        cents: sql<number>`coalesce(sum(${pledges.amountCents}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(pledges)
      .where(eq(pledges.campaignId, row.id));

    out.push({
      id: row.id,
      slug: row.slug ?? row.id,
      name: row.name,
      description: row.description,
      fundId: row.fundId,
      fundName: row.fundName,
      targetCents: row.targetCents,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      archived: row.archivedAt !== null,
      receivedCents: received?.cents ?? 0,
      pledgedCents: promised?.cents ?? 0,
      pledges: promised?.count ?? 0,
    });
  }

  return out;
}

export async function getCampaign(db: Tx, id: string): Promise<Campaign | null> {
  /* Found by the name in the address, and by the id for a link saved
     before campaigns had one. */
  const all = await listCampaigns(db, { includeArchived: true });
  return all.find((one) => one.slug === id || one.id === id) ?? null;
}

/** R13.16. Writing a campaign down, or changing one. */
export async function writeCampaign(
  db: Tx,
  actor: WriteActor,
  input: {
    id?: string;
    name: string;
    description?: string | null;
    fundId: string;
    targetCents: number;
    startsOn: string;
    endsOn?: string | null;
  },
): Promise<{ id: string }> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");

  const name = input.name?.trim();
  if (!name) throw new InvalidInputError("campaign.error.name");
  if (!Number.isInteger(input.targetCents) || input.targetCents < 0) {
    throw new InvalidInputError("campaign.error.target");
  }

  const [fund] = await db
    .select({ id: funds.id })
    .from(funds)
    .where(and(eq(funds.id, input.fundId), isNull(funds.archivedAt)))
    .limit(1);
  if (!fund) throw new InvalidInputError("gift.error.fund");

  const [clash] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      input.id
        ? and(eq(campaigns.name, name), ne(campaigns.id, input.id))
        : eq(campaigns.name, name),
    )
    .limit(1);
  if (clash) throw new InvalidInputError("campaign.error.taken");

  const values = {
    name: name.slice(0, 80),
    slug: slugOf(name),
    description: input.description?.trim() || null,
    fundId: input.fundId,
    targetCents: input.targetCents,
    startsOn: day(input.startsOn, "campaign.error.dates"),
    endsOn: input.endsOn ? day(input.endsOn, "campaign.error.dates") : null,
  };

  if (values.endsOn && values.endsOn < values.startsOn) {
    throw new InvalidInputError("campaign.error.dates");
  }

  if (input.id) {
    const changed = await db
      .update(campaigns)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(campaigns.id, input.id))
      .returning({ id: campaigns.id });
    if (changed.length === 0) throw new InvalidInputError("campaign.error.missing");
    return { id: input.id };
  }

  const [row] = await db
    .insert(campaigns)
    .values({ tenantId: actor.tenantId, ...values })
    .returning({ id: campaigns.id });
  return { id: row!.id };
}

/** R13.16. Closing a campaign, or putting it back on the list. */
export async function setCampaignArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const changed = await db
    .update(campaigns)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id });
  if (changed.length === 0) throw new InvalidInputError("campaign.error.missing");
}

/**
 * R13.16, R13.18. The commitments, and what each household has given against
 * one.
 *
 * The household roll-up is the point: a couple pledge once, and whichever of
 * them writes the cheque, the pledge reads as kept.
 */
export async function listPledges(
  db: Tx,
  who: WriteActor,
  campaignId: string,
): Promise<Pledge[]> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");

  const campaign = await getCampaign(db, campaignId);
  if (!campaign) return [];

  const rows = await db
    .select({
      id: pledges.id,
      memberId: pledges.memberId,
      first: members.firstName,
      last: members.lastName,
      amountCents: pledges.amountCents,
      note: pledges.note,
      /*
       * Everything given to the campaign's fund inside its period by anybody
       * in this person's household, or by them where they have none.
       */
      givenCents: sql<number>`(
        select coalesce(sum(g.amount_cents - g.refunded_cents), 0)::int
          from gifts g
         where g.fund_id = ${campaign.fundId}
           and g.status = 'settled'
           and g.received_on >= ${campaign.startsOn}::date
           ${campaign.endsOn ? sql`and g.received_on <= ${campaign.endsOn}::date` : sql``}
           and (
             g.member_id = ${pledges.memberId}
             or g.member_id in (
               select hm2.member_id
                 from household_memberships hm1
                 join household_memberships hm2 on hm2.household_id = hm1.household_id
                where hm1.member_id = ${pledges.memberId}
             )
           )
      )`,
    })
    .from(pledges)
    .innerJoin(members, eq(members.id, pledges.memberId))
    .where(eq(pledges.campaignId, campaign.id))
    .orderBy(desc(pledges.amountCents), asc(members.lastName));

  return rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    name: [row.first, row.last].filter(Boolean).join(" "),
    amountCents: row.amountCents,
    givenCents: row.givenCents,
    note: row.note,
  }));
}

/** R13.16. One household's commitment, written down or corrected. */
export async function writePledge(
  db: Tx,
  actor: WriteActor,
  input: { campaignId: string; memberId: string; amountCents: number; note?: string | null },
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new InvalidInputError("campaign.error.target");
  }

  await db
    .insert(pledges)
    .values({
      tenantId: actor.tenantId,
      campaignId: input.campaignId,
      memberId: input.memberId,
      amountCents: input.amountCents,
      note: input.note?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [pledges.campaignId, pledges.memberId],
      set: {
        amountCents: input.amountCents,
        note: input.note?.trim() || null,
        updatedAt: new Date(),
      },
    });
}

/** R13.16. Taking a commitment back off. */
export async function removePledge(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const gone = await db.delete(pledges).where(eq(pledges.id, id)).returning({ id: pledges.id });
  if (gone.length === 0) throw new InvalidInputError("campaign.error.missing");
}

/** A name as it reads in an address. The church's own names are unique. */
function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "campaign";
}
