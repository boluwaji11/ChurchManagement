"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, createPerson, updatePerson, setPersonArchived, getPerson,
  listCustomFields, setCustomValues, coerceCustomValue, setPersonTag, listTagsForPerson,
  type CustomFieldDef, type CustomValue,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
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

/**
 * Reads the custom field inputs off the form and checks each one against its
 * definition.
 *
 * A checkbox that is off sends nothing at all, so booleans are read from
 * presence rather than from a value. Every other type reads what is there, and a
 * blank of any kind clears the field.
 */
function readCustomValues(
  data: FormData,
  fields: CustomFieldDef[],
): { values: Record<string, CustomValue>; errors: PersonErrors } {
  const values: Record<string, CustomValue> = {};
  const errors: PersonErrors = {};

  for (const field of fields) {
    const name = `cf_${field.id}`;
    const raw: CustomValue =
      field.type === "boolean"
        ? data.get(name) !== null
        : field.type === "multi_select"
          ? data.getAll(name).map(String)
          : (data.get(name) as string | null);

    const result = coerceCustomValue(field, raw);
    if ("error" in result) errors[name] = result.error;
    else values[field.id] = result.value;
  }

  return { values, errors };
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

  let memberId = id;
  try {
    const failed = await withTenant(ctx, async (tx) => {
      const actor = { tenantId: session.tenantId, role: session.role };
      const fields = await listCustomFields(tx, "person");
      const custom = readCustomValues(data, fields);
      if (hasErrors(custom.errors)) return custom.errors;

      if (id) {
        await updatePerson(tx, actor, id, input);
      } else {
        memberId = (await createPerson(tx, actor, input)).id;
      }

      await setCustomValues(tx, actor, "person", memberId!, custom.values);

      // R2.x. The tag row on the form is the whole set, so whatever is not
      // ticked comes off as well as whatever is ticked going on.
      const wanted = String(data.get("tagIds") ?? "").split(",").filter(Boolean);
      const held = (await listTagsForPerson(tx, memberId!)).map((x) => x.id);
      for (const tagId of wanted) {
        if (!held.includes(tagId)) await setPersonTag(tx, actor, memberId!, tagId, true);
      }
      for (const tagId of held) {
        if (!wanted.includes(tagId)) await setPersonTag(tx, actor, memberId!, tagId, false);
      }
      return null;
    });

    if (failed) return { errors: failed };
  } catch (error) {
    return { formError: explain(error) };
  }

  const where = await withTenant(ctx, async (tx) => {
    const saved = await getPerson(tx, memberId!, { role: session.role, userId: session.userId });
    return saved?.slug ?? memberId!;
  });

  revalidatePath("/members");
  redirect(`/members/${where}?church=${session.tenantSlug}&saved=1`);
}

export async function setArchived(data: FormData): Promise<SaveResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "");
  const archived = String(data.get("archived") ?? "") === "1";
  if (!id) return { formError: t("error.notFound.person") };

  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      setPersonArchived(tx, { tenantId: session.tenantId, role: session.role }, id, archived),
    );
  } catch (error) {
    return { formError: explain(error) };
  }

  const back = archived
    ? null
    : await withTenant(ctx, async (tx) => {
        const one = await getPerson(tx, id, { role: session.role, userId: session.userId });
        return one?.slug ?? id;
      });

  revalidatePath("/members");
  redirect(
    archived
      ? `/members?church=${session.tenantSlug}&archived=1`
      : `/members/${back}?church=${session.tenantSlug}&restored=1`,
  );
}
