"use server";

import { withTenant, setDirectoryPreferences, personForUser } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface PrivacyResult {
  error?: string;
}

const on = (data: FormData, name: string) => data.get(name) === "on";

/** R3.2, R3.3. A member deciding what other members see of them. */
export async function savePrivacy(data: FormData): Promise<PrivacyResult> {
  const session = await requireSession(String(data.get("church") ?? "") || undefined);
  const ctx = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

  try {
    await withTenant(ctx, async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return;
      return setDirectoryPreferences(tx, { ...ctx, personId: self }, self, {
        listed: on(data, "listed"),
        showEmail: on(data, "showEmail"),
        showPhone: on(data, "showPhone"),
        showAddress: on(data, "showAddress"),
        showBirthday: on(data, "showBirthday"),
        showPhoto: on(data, "showPhoto"),
        showChildren: on(data, "showChildren"),
      });
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
