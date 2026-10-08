"use server";

import {
  withTenant, updateOwnProfile, setOwnPhoto, setAccountName,
  listCustomFields, setOwnCustomValues, coerceCustomValue,
  type CustomValue,
} from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface ProfileResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

/** A picker nobody answered, which comes back as an empty string. */
const pick = (data: FormData, name: string): string | null => field(data, name) || null;

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
      updateOwnProfile(
        tx,
        { tenantId: session.tenantId, userId: session.userId, email: session.email },
        {
          firstName: field(data, "firstName"),
          lastName: field(data, "lastName"),
          phone: field(data, "phone") || null,
          dateOfBirth: field(data, "dateOfBirth") || null,
          address: {
            line1: field(data, "addressLine1") || null,
            line2: field(data, "addressLine2") || null,
            city: field(data, "addressCity") || null,
            region: field(data, "addressRegion") || null,
            postalCode: field(data, "addressPostalCode") || null,
      country: field(data, "addressCountry") || "US",
          },
          anniversary: field(data, "anniversary") || null,
          campusId: pick(data, "campusId"),
          maritalStatus: pick(data, "maritalStatus"),
        },
      ),
    );
    if (!person) return { error: t("settings.profile.noRecord") };

    /*
     * R1.10, R17.1. The church's own fields, where it said the member keeps
     * them. The repository checks that again, so a field the church did not
     * open is not written even if the form carried it.
     */
    await withTenant(ctx, async (tx) => {
      const fields = (await listCustomFields(tx, "person"))
        .filter((one) => one.memberEditable);
      if (fields.length === 0) return;

      const values: Record<string, CustomValue> = {};
      for (const one of fields) {
        const name = `cf_${one.id}`;
        const raw: CustomValue =
          one.type === "boolean"
            ? data.get(name) !== null
            : one.type === "multi_select"
              ? data.getAll(name).map(String)
              : (data.get(name) as string | null);
        const read = coerceCustomValue(one, raw);
        // A bad value is left as it was. The church's own form reports these
        // against the field; here there is nowhere on screen to put it.
        if (!("error" in read)) values[one.id] = read.value;
      }
      await setOwnCustomValues(tx, session.tenantId, person, values);
    });

    /*
     * The name on the account follows the name on the record, so the sidebar
     * and the person's own screen never disagree about what they are called.
     * Both copies: app_users is what the church's own screens read, and the
     * auth user's metadata is what builds the session on the next request.
     */
    const name = `${field(data, "firstName")} ${field(data, "lastName")}`.trim();
    await setAccountName(session.userId, name);
    if (name) {
      const supabase = await supabaseServer();
      await supabase.auth.updateUser({ data: { full_name: name } });
    }
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R17.1. Taking your photograph off your own record. */
export async function clearPhoto(church?: string): Promise<ProfileResult> {
  const session = await requireSession(church);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  try {
    const removed = await withTenant(ctx, (tx) =>
      setOwnPhoto(tx, { userId: session.userId }, null),
    );
    if (removed.removed) {
      const supabase = await supabaseServer();
      await supabase.storage.from("church").remove([removed.removed]);
    }
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
