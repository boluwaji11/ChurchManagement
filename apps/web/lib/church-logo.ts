import "server-only";
import { cache } from "react";
import { withTenant, getChurch, type TenantRole } from "@hearth/db";
import { supabaseServer } from "./supabase/server";

/**
 * The church's logo, as a URL that can be put in an img tag.
 *
 * The bucket is private, so this is a signed URL rather than a path. Cached per
 * request, because the header asks for it on every page and a second signature
 * for the same file in the same render is a round trip for nothing.
 *
 * An hour is long enough that the page does not expire while somebody reads it,
 * and short enough that a copied URL stops working the same day.
 */
export const churchLogoUrl = cache(
  async (tenantId: string, role: TenantRole): Promise<string | null> => {
    const profile = await withTenant({ tenantId, role }, (tx) => getChurch(tx, tenantId));
    if (!profile?.logoKey) return null;

    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(profile.logoKey, 3600);
    return signed.data?.signedUrl ?? null;
  },
);
