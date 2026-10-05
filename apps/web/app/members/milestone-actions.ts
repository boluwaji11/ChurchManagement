"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, addMilestone, removeMilestone,
  MILESTONE_KINDS, type MilestoneKind,
} from "@hearth/db";
import { requireSession } from "@/lib/session";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";

export interface MilestoneResponse {
  error?: string;
  /** True when the write also changed the person's own record. */
  updatedPerson?: boolean;
  kind?: string;
}

async function writeContext(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    session,
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    },
  };
}

const isKind = (value: string): value is MilestoneKind =>
  (MILESTONE_KINDS as readonly string[]).includes(value);

export async function addPersonMilestone(data: FormData): Promise<MilestoneResponse> {
  const slug = String(data.get("church") ?? "") || undefined;
  const memberId = String(data.get("memberId") ?? "");
  const kind = String(data.get("kind") ?? "");
  const occurredOn = String(data.get("occurredOn") ?? "");
  const notes = String(data.get("notes") ?? "");

  if (!memberId) return { error: t("error.notFound.person") };
  if (!isKind(kind)) return { error: t("milestone.chooseKind") };

  const { session, ctx } = await writeContext(slug);

  try {
    const result = await withTenant(ctx, (tx) =>
      addMilestone(tx, { tenantId: session.tenantId, role: session.role }, {
        memberId, kind, occurredOn, notes,
      }),
    );
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/members");
    return { updatedPerson: result.updatedPerson, kind };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removePersonMilestone(data: FormData): Promise<MilestoneResponse> {
  const slug = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "");
  const memberId = String(data.get("memberId") ?? "");
  if (!id) return { error: t("milestone.error.notFound") };

  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      removeMilestone(tx, { tenantId: session.tenantId, role: session.role }, id),
    );
    revalidatePath(`/members/${memberId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
