"use server";

import { revalidatePath } from "next/cache";
import { withTenant, setPersonAbility, canEditPeople } from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

/** R2.9. Saying this person has a skill, an interest or a gift, or no longer does. */
export async function toggleAbility(
  personId: string,
  abilityId: string,
  on: boolean,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession(church);
    if (!canEditPeople(session.role)) return { error: t("forbidden.addPeople") };

    await withTenant(session, (tx) => setPersonAbility(tx, session, { personId, abilityId, on }));
    revalidatePath(`/people/${personId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
