"use server";

import { withTenant, updateOwnProfile } from "@hearth/db";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface ProfileResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

/**
 * R17.1. Saving your own details.
 *
 * No person id crosses the boundary. The record is the one tied to the signed
 * in account, so nobody can edit somebody else by changing a value in the form.
 */
export async function saveProfile(data: FormData): Promise<ProfileResult> {
  const session = await requireSession(field(data, "church") || undefined);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  try {
    const person = await withTenant(ctx, (tx) =>
      updateOwnProfile(tx, { tenantId: session.tenantId, userId: session.userId }, {
        firstName: field(data, "firstName"),
        lastName: field(data, "lastName"),
        preferredName: field(data, "preferredName") || null,
        email: field(data, "email") || null,
        phone: field(data, "phone") || null,
        dateOfBirth: field(data, "dateOfBirth") || null,
      }),
    );
    if (!person) return { error: t("settings.profile.noRecord") };
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
