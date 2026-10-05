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
  input: { personId: string; kind: ContactKind; label: string; value: string },
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx, slug } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      addContact(tx, actor, input.personId, {
        kind: input.kind,
        label: input.label as ContactLabel,
        value: input.value,
      }),
    );
    revalidatePath(`/members/${input.personId}`);
    void slug;
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeOne(
  id: string,
  personId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeContact(tx, actor, id));
    revalidatePath(`/members/${personId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leadWithOne(
  id: string,
  personId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => makeContactPrimary(tx, actor, id));
    revalidatePath(`/members/${personId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function addPlace(
  input: { personId: string; label: string; values: Record<string, string> },
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      addAddress(tx, actor, input.personId, {
        label: input.label as ContactLabel,
        line1: input.values.line1 ?? "",
        line2: input.values.line2,
        city: input.values.city,
        region: input.values.region,
        postalCode: input.values.postalCode,
        country: input.values.country,
      }),
    );
    revalidatePath(`/members/${input.personId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removePlace(
  id: string,
  personId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeAddress(tx, actor, id));
    revalidatePath(`/members/${personId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leadWithPlace(
  id: string,
  personId: string,
  church?: string,
): Promise<{ error?: string }> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => makeAddressPrimary(tx, actor, id));
    revalidatePath(`/members/${personId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
