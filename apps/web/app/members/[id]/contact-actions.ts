"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, addContact, removeContact, makeContactPrimary,
  addAddress, removeAddress, makeAddressPrimary,
  type ContactKind, type ContactLabel,
} from "@hearth/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

/** R2.4. The three things a church does to a list of contacts. */
async function context(church?: string) {
  const session = await requireSession(church);
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

export async function addOne(
  input: { memberId: string; kind: ContactKind; label: string; value: string },
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx, slug } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      addContact(tx, actor, input.memberId, {
        kind: input.kind,
        label: input.label as ContactLabel,
        value: input.value,
      }),
    );
    revalidatePath(`/members/${input.memberId}`);
    void slug;
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeOne(
  id: string,
  memberId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeContact(tx, actor, id));
    revalidatePath(`/members/${memberId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leadWithOne(
  id: string,
  memberId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => makeContactPrimary(tx, actor, id));
    revalidatePath(`/members/${memberId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function addPlace(
  input: { memberId: string; label: string; values: Record<string, string> },
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
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
    revalidatePath(`/members/${input.memberId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removePlace(
  id: string,
  memberId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeAddress(tx, actor, id));
    revalidatePath(`/members/${memberId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leadWithPlace(
  id: string,
  memberId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => makeAddressPrimary(tx, actor, id));
    revalidatePath(`/members/${memberId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
