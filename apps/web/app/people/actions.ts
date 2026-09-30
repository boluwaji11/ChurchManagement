"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, createPerson, updatePerson, setPersonArchived, PermissionError,
} from "@hearth/db";
import { requireSession } from "@/lib/session";
import { parsePerson, personErrors, hasErrors, type PersonErrors } from "@/lib/person-input";

export interface SaveResult {
  /** Field messages, keyed the same way the form keys its inputs. */
  errors?: PersonErrors;
  /** Something the form as a whole needs to say, such as a refused permission. */
  formError?: string;
}

/**
 * The actor for a write.
 *
 * userId and ip are passed so the audit trigger records who made the change and
 * from where. Reads can skip them. A write that cannot be attributed is a write
 * nobody can answer for six months later, which is the whole point of R1.11.
 */
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

/** Creates or updates, depending on whether the form carried an id. */
export async function savePerson(data: FormData): Promise<SaveResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "") || undefined;

  const input = parsePerson(data);

  // Validated again here. The browser copy of these rules is for speed, not for
  // safety, and a form post does not have to come from our form.
  const errors = personErrors(input);
  if (hasErrors(errors)) return { errors };

  const { session, ctx } = await writeContext(slug);

  let personId = id;
  try {
    await withTenant(ctx, async (tx) => {
      const actor = { tenantId: session.tenantId, role: session.role };
      if (id) {
        await updatePerson(tx, actor, id, input);
      } else {
        personId = (await createPerson(tx, actor, input)).id;
      }
    });
  } catch (error) {
    if (error instanceof PermissionError) return { formError: error.message };
    throw error;
  }

  revalidatePath("/people");
  redirect(`/people/${personId}?church=${session.tenantSlug}&saved=1`);
}

export async function setArchived(data: FormData): Promise<SaveResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "");
  const archived = String(data.get("archived") ?? "") === "1";
  if (!id) return { formError: "That person could not be found. Reload and try again." };

  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      setPersonArchived(tx, { tenantId: session.tenantId, role: session.role }, id, archived),
    );
  } catch (error) {
    if (error instanceof PermissionError) return { formError: error.message };
    throw error;
  }

  revalidatePath("/people");
  redirect(
    archived
      ? `/people?church=${session.tenantSlug}&archived=1`
      : `/people/${id}?church=${session.tenantSlug}&restored=1`,
  );
}
