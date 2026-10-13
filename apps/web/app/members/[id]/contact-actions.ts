"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, addContact, removeContact, makeContactPrimary,
  addAddress, removeAddress, makeAddressPrimary,
  type ContactKind, type ContactLabel,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

/** R2.4. The three things a church does to a list of contacts. */
async function context() {
  const session = await requireSession();
  return {
    actor: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    slug: session.tenantSlug,
  };
}


/**
 * R2.4. Redraws the record wherever it is being read.
 *
 * The record is addressed by its readable name and these writes carry the id,
 * so a path built from the id revalidated nothing: a phone was added and the
 * card it was added to kept showing what it held before.
 */
function revalidateRecord() {
  revalidatePath("/members/[id]", "page");
  revalidatePath("/members/[id]/edit", "page");
  revalidatePath("/members");
}

export async function addOne(
  input: { memberId: string; kind: ContactKind; label: string; value: string },
  ): Promise<{ error?: string }> {
  const { actor, ctx, slug } = await context();
  try {
    await withTenant(ctx, (tx) =>
      addContact(tx, actor, input.memberId, {
        kind: input.kind,
        label: input.label as ContactLabel,
        value: input.value,
      }),
    );
    revalidateRecord();
    void slug;
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeOne(id: string): Promise<{ error?: string }> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => removeContact(tx, actor, id));
    revalidateRecord();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leadWithOne(id: string): Promise<{ error?: string }> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => makeContactPrimary(tx, actor, id));
    revalidateRecord();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function addPlace(
  input: { memberId: string; label: string; values: Record<string, string> },
  ): Promise<{ error?: string }> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) =>
      addAddress(tx, actor, input.memberId, {
        label: input.label as ContactLabel,
        line1: input.values.line1 ?? "",
        line2: input.values.line2,
        city: input.values.city,
        region: input.values.region,
        postalCode: input.values.postalCode,
        country: input.values.country,
      }),
    );
    revalidateRecord();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removePlace(id: string): Promise<{ error?: string }> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => removeAddress(tx, actor, id));
    revalidateRecord();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leadWithPlace(id: string): Promise<{ error?: string }> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => makeAddressPrimary(tx, actor, id));
    revalidateRecord();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
