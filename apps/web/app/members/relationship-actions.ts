"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, addRelationship, removeRelationship,
  RELATIONSHIP_KINDS, type RelationshipKind,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";


/**
 * R2.x. Redraws the record wherever it is being read.
 *
 * The record is addressed by its readable name while these writes carry the
 * id, so a path built from the id revalidated nothing.
 */
function revalidateRecord() {
  revalidatePath("/members/[id]", "page");
  revalidatePath("/members/[id]/edit", "page");
  revalidatePath("/members");
}

export interface RelationshipResponse {
  error?: string;
  /** Contact records a do-not-contact order cancelled, so the page can say so. */
  cancelled?: number;
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

const isKind = (value: string): value is RelationshipKind =>
  (RELATIONSHIP_KINDS as readonly string[]).includes(value);

export async function addRelation(data: FormData): Promise<RelationshipResponse> {
  const slug = String(data.get("church") ?? "") || undefined;
  const memberId = String(data.get("memberId") ?? "");
  const relatedMemberId = String(data.get("relatedMemberId") ?? "");
  const kind = String(data.get("kind") ?? "");

  if (!memberId || !relatedMemberId) return { error: t("relationship.error.notFound") };
  if (!isKind(kind)) return { error: t("relationship.error.notFound") };

  const { session, ctx } = await writeContext(slug);

  try {
    const result = await withTenant(ctx, (tx) =>
      addRelationship(tx, { tenantId: session.tenantId, role: session.role }, {
        memberId, relatedMemberId, kind,
      }),
    );
    revalidateRecord();
    return { cancelled: result.cancelled };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeRelation(data: FormData): Promise<RelationshipResponse> {
  const slug = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "");
  if (!id) return { error: t("relationship.error.notFound") };

  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      removeRelationship(tx, { tenantId: session.tenantId, role: session.role }, id),
    );
    revalidateRecord();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
