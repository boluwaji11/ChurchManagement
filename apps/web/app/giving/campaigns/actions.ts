"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, writeCampaign, setCampaignArchived, writePledge, removePledge,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface CampaignResult {
  error?: string;
  id?: string;
}

async function context(church?: string) {
  const session = await requireSession(church);
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  return { actor: who, ctx: who };
}

/** R13.16. Writing a campaign down, or changing one. */
export async function saveCampaign(
  input: {
    id?: string;
    name: string;
    description?: string | null;
    fundId: string;
    targetCents: number;
    startsOn: string;
    endsOn?: string | null;
  },
  church?: string,
): Promise<CampaignResult> {
  const { actor, ctx } = await context(church);
  try {
    const { id } = await withTenant(ctx, (tx) => writeCampaign(tx, actor, input));
    revalidatePath("/giving/campaigns");
    return { id };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.16. Closing a campaign, or putting it back. */
export async function closeCampaign(
  id: string,
  archived: boolean,
  church?: string,
): Promise<CampaignResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setCampaignArchived(tx, actor, id, archived));
    revalidatePath("/giving/campaigns");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.16. One household's commitment. */
export async function savePledge(
  input: { campaignId: string; memberId: string; amountCents: number; note?: string | null },
  church?: string,
): Promise<CampaignResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => writePledge(tx, actor, input));
    revalidatePath("/giving/campaigns/[slug]", "page");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropPledge(
  id: string,
  campaignId: string,
  church?: string,
): Promise<CampaignResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removePledge(tx, actor, id));
    revalidatePath("/giving/campaigns/[slug]", "page");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
